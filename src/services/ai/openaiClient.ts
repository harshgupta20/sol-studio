// Direct-from-browser OpenAI (ChatGPT) client. OpenAI's API is CORS-enabled for
// browser use (the same thing the SDK's dangerouslyAllowBrowser flag relies on),
// so the user's key goes straight from their browser to OpenAI — no proxy.
//
// Structured output uses a forced function tool_choice (Chat Completions) — the
// model returns JSON in tool_calls[].function.arguments, assembled from the
// streamed deltas. Mirrors the Anthropic client so the provider layer is uniform.

import { AIError } from './aiError';

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';
export const DEFAULT_MODEL = 'gpt-4o';

export interface OpenAIToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StructuredCallOptions {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  tool: OpenAIToolDef;
  maxTokens?: number;
  signal?: AbortSignal;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
}

async function readError(res: Response): Promise<AIError> {
  let message = `OpenAI request failed (${res.status}).`;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    /* ignore */
  }
  if (res.status === 401) {
    return new AIError('OpenAI API key is invalid. Check your key in AI Settings.', 'unauthorized', 401);
  }
  if (res.status === 429) {
    return new AIError('OpenAI rate limit or quota reached. Wait a moment and retry.', 'rate_limited', 429);
  }
  if (res.status >= 500) {
    return new AIError('OpenAI is unavailable right now. Please retry shortly.', 'overloaded', res.status);
  }
  if (res.status === 400) return new AIError(message, 'bad_request', 400);
  return new AIError(message, 'http', res.status);
}

/** Iterate the SSE stream, invoking `onEvent` with each parsed data object. */
async function forEachEvent(res: Response, onEvent: (evt: any) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new AIError('No response stream from OpenAI.', 'no_output');
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of chunk.split('\n')) {
        const trimmed = line.trimStart();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        let evt: any;
        try {
          evt = JSON.parse(payload);
        } catch {
          continue;
        }
        if (evt?.error) throw new AIError(evt.error.message ?? 'OpenAI stream error.', 'http');
        onEvent(evt);
      }
    }
  }
}

function refusalIf(finishReason: string | null): void {
  if (finishReason === 'content_filter') {
    throw new AIError('OpenAI declined this request (content filter). Try rephrasing.', 'refusal');
  }
}

/** One forced-function structured call. Returns the validated arguments object. */
export async function structuredCall<T>(opts: StructuredCallOptions): Promise<T> {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_completion_tokens: opts.maxTokens ?? 16000,
    stream: true,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.prompt },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: opts.tool.name,
          description: opts.tool.description,
          parameters: opts.tool.input_schema,
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: opts.tool.name } },
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: authHeaders(opts.apiKey),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AIError('Could not reach OpenAI. Check your connection.', 'network');
  }
  if (!res.ok) throw await readError(res);

  let args = '';
  let finishReason: string | null = null;
  await forEachEvent(res, (evt) => {
    const choice = evt.choices?.[0];
    if (!choice) return;
    const delta = choice.delta ?? {};
    const call = delta.tool_calls?.[0];
    if (call?.function?.arguments) args += call.function.arguments;
    if (choice.finish_reason) finishReason = choice.finish_reason;
  });
  refusalIf(finishReason);

  if (!args.trim()) throw new AIError('OpenAI did not return a structured result.', 'no_output');
  try {
    return JSON.parse(args) as T;
  } catch {
    throw new AIError('OpenAI returned malformed structured output.', 'no_output');
  }
}

export interface TextCallOptions {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

/** A plain text streaming call (repository Q&A). */
export async function textCall(opts: TextCallOptions): Promise<string> {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_completion_tokens: opts.maxTokens ?? 4000,
    stream: true,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.prompt },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: authHeaders(opts.apiKey),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AIError('Could not reach OpenAI. Check your connection.', 'network');
  }
  if (!res.ok) throw await readError(res);

  let text = '';
  let finishReason: string | null = null;
  await forEachEvent(res, (evt) => {
    const choice = evt.choices?.[0];
    if (!choice) return;
    const d = choice.delta?.content;
    if (typeof d === 'string' && d) {
      text += d;
      opts.onDelta?.(d);
    }
    if (choice.finish_reason) finishReason = choice.finish_reason;
  });
  refusalIf(finishReason);
  return text;
}

/** Validate the key cheaply via GET /v1/models (no tokens spent). */
export async function validateApiKey(apiKey: string, _model = DEFAULT_MODEL): Promise<void> {
  void _model;
  let res: Response;
  try {
    res = await fetch(OPENAI_MODELS_URL, { headers: authHeaders(apiKey) });
  } catch {
    throw new AIError('Could not reach OpenAI. Check your connection.', 'network');
  }
  if (res.ok || res.status === 429) return;
  throw await readError(res);
}
