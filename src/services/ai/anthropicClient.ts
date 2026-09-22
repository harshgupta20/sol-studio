// Direct-from-browser Anthropic Messages API client. No SDK bundle: we call the
// REST endpoint with `anthropic-dangerous-direct-browser-access` (the same
// mechanism the SDK's dangerouslyAllowBrowser flag enables) so the user's key
// never leaves their browser and no backend proxy is needed.
//
// Structured output uses a forced single-tool call (tool_choice) — the model
// returns validated JSON in a tool_use block. We stream the response so large
// implementations don't hit request timeouts.

import { AIError } from './aiError';

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const DEFAULT_MODEL = 'claude-opus-4-8';

export { AIError };
export type { AIErrorCode } from './aiError';

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StructuredCallOptions {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  tool: AnthropicToolDef;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface StreamResult {
  toolInput: unknown;
  text: string;
  stopReason: string | null;
}

function baseHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

async function readError(res: Response): Promise<AIError> {
  let message = `Anthropic request failed (${res.status}).`;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    /* ignore */
  }
  if (res.status === 401) {
    return new AIError('AI API key is invalid. Check your key in AI Settings.', 'unauthorized', 401);
  }
  if (res.status === 429) {
    return new AIError('AI provider rate limit reached. Wait a moment and retry.', 'rate_limited', 429);
  }
  if (res.status === 529) {
    return new AIError('The AI provider is overloaded. Please retry shortly.', 'overloaded', 529);
  }
  if (res.status === 400) return new AIError(message, 'bad_request', 400);
  return new AIError(message, 'http', res.status);
}

/**
 * Parse the SSE stream, reconstructing the forced tool_use input (assembled
 * from input_json_delta fragments) plus any text.
 */
async function consumeStream(res: Response): Promise<StreamResult> {
  const reader = res.body?.getReader();
  if (!reader) throw new AIError('No response stream from AI provider.', 'no_output');
  const decoder = new TextDecoder();

  let buffer = '';
  let toolJson = '';
  let text = '';
  let stopReason: string | null = null;
  // Track which block index is the tool_use block.
  let toolBlockIndex: number | null = null;

  const handleEvent = (payload: string) => {
    let evt: any;
    try {
      evt = JSON.parse(payload);
    } catch {
      return;
    }
    switch (evt.type) {
      case 'content_block_start':
        if (evt.content_block?.type === 'tool_use') toolBlockIndex = evt.index;
        break;
      case 'content_block_delta':
        if (evt.delta?.type === 'input_json_delta' && evt.index === toolBlockIndex) {
          toolJson += evt.delta.partial_json ?? '';
        } else if (evt.delta?.type === 'text_delta') {
          text += evt.delta.text ?? '';
        }
        break;
      case 'message_delta':
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
        break;
      case 'error':
        throw new AIError(evt.error?.message ?? 'AI stream error.', 'http');
      default:
        break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events are separated by a blank line; each line may be "data: ...".
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of chunk.split('\n')) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('data:')) handleEvent(trimmed.slice(5).trim());
      }
    }
  }

  if (stopReason === 'refusal') {
    throw new AIError(
      'The AI declined this request. Try rephrasing your requirement.',
      'refusal',
    );
  }

  let toolInput: unknown = undefined;
  if (toolJson.trim()) {
    try {
      toolInput = JSON.parse(toolJson);
    } catch {
      throw new AIError('The AI returned malformed structured output.', 'no_output');
    }
  }
  return { toolInput, text, stopReason };
}

/** One forced-tool structured call. Returns the validated tool input object. */
export async function structuredCall<T>(opts: StructuredCallOptions): Promise<T> {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    stream: true,
    system: opts.system,
    tools: [opts.tool],
    tool_choice: { type: 'tool', name: opts.tool.name },
    messages: [{ role: 'user', content: opts.prompt }],
  };

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: baseHeaders(opts.apiKey),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AIError(
      'Could not reach the AI provider. Check your connection.',
      'network',
    );
  }
  if (!res.ok) throw await readError(res);

  const { toolInput } = await consumeStream(res);
  if (toolInput === undefined) {
    throw new AIError('The AI did not return a structured result.', 'no_output');
  }
  return toolInput as T;
}

export interface TextCallOptions {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Called with incremental text as it streams in. */
  onDelta?: (delta: string) => void;
}

/** A plain text streaming call (repository Q&A). */
export async function textCall(opts: TextCallOptions): Promise<string> {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    stream: true,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  };

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: baseHeaders(opts.apiKey),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AIError('Could not reach the AI provider. Check your connection.', 'network');
  }
  if (!res.ok) throw await readError(res);

  // Reuse the stream reader but capture text deltas via onDelta.
  const reader = res.body?.getReader();
  if (!reader) throw new AIError('No response stream from AI provider.', 'no_output');
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let stopReason: string | null = null;

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
        let evt: any;
        try {
          evt = JSON.parse(trimmed.slice(5).trim());
        } catch {
          continue;
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          const d = evt.delta.text ?? '';
          text += d;
          opts.onDelta?.(d);
        } else if (evt.type === 'message_delta' && evt.delta?.stop_reason) {
          stopReason = evt.delta.stop_reason;
        } else if (evt.type === 'error') {
          throw new AIError(evt.error?.message ?? 'AI stream error.', 'http');
        }
      }
    }
  }

  if (stopReason === 'refusal') {
    throw new AIError('The AI declined to answer that.', 'refusal');
  }
  return text;
}

/** Lightweight key validation: a tiny structured call. */
export async function validateApiKey(apiKey: string, model = DEFAULT_MODEL): Promise<void> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: baseHeaders(apiKey),
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  }).catch(() => {
    throw new AIError('Could not reach the AI provider. Check your connection.', 'network');
  });
  // 200 or 429 (rate-limited but authenticated) both mean the key is valid.
  if (res.ok || res.status === 429) return;
  throw await readError(res);
}
