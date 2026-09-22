// Public surface of the AI service layer + the provider registry.
// To add a provider: implement AIProvider (a client + a provider class) and add
// one entry to PROVIDERS below. Everything else (config, settings UI) is
// data-driven from this registry.

import type { AIConfig, AIProviderId } from '../../types';
import type { AIProvider } from './types';
import { AnthropicProvider } from './anthropicProvider';
import { OpenAIProvider } from './openaiProvider';
import {
  DEFAULT_MODEL as ANTHROPIC_DEFAULT_MODEL,
  validateApiKey as validateAnthropicKey,
} from './anthropicClient';
import {
  DEFAULT_MODEL as OPENAI_DEFAULT_MODEL,
  validateApiKey as validateOpenAIKey,
} from './openaiClient';

export { AIError } from './aiError';
export type { AIErrorCode } from './aiError';
export { AnthropicProvider } from './anthropicProvider';
export { OpenAIProvider } from './openaiProvider';
export type { AIProvider, AICallOpts, ChangeSummary } from './types';

export interface ProviderModel {
  id: string;
  label: string;
}

export interface ProviderMeta {
  id: AIProviderId;
  label: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyHelp: string;
  defaultModel: string;
  /** Suggested models — the model field is a free-text combobox, so any id works. */
  models: ProviderModel[];
  create: (config: AIConfig) => AIProvider;
  validateKey: (apiKey: string, model: string) => Promise<void>;
}

export const PROVIDERS: Record<AIProviderId, ProviderMeta> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    keyLabel: 'Anthropic API key',
    keyPlaceholder: 'sk-ant-…',
    keyHelp: 'Create one at console.anthropic.com → API Keys.',
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    models: [
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 — most capable' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — balanced' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — fastest' },
    ],
    create: (c) => new AnthropicProvider({ apiKey: c.apiKey, model: c.model }),
    validateKey: validateAnthropicKey,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    keyLabel: 'OpenAI API key',
    keyPlaceholder: 'sk-…',
    keyHelp: 'Create one at platform.openai.com → API keys.',
    defaultModel: OPENAI_DEFAULT_MODEL,
    models: [
      { id: 'gpt-4o', label: 'GPT-4o — capable, broadly available' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini — fast & low cost' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-5', label: 'GPT-5 (requires account access)' },
    ],
    create: (c) => new OpenAIProvider({ apiKey: c.apiKey, model: c.model }),
    validateKey: validateOpenAIKey,
  },
};

export const PROVIDER_LIST: ProviderMeta[] = Object.values(PROVIDERS);

function metaFor(provider: AIProviderId): ProviderMeta {
  return PROVIDERS[provider] ?? PROVIDERS.anthropic;
}

/** Factory: build the provider for the given config. */
export function createProvider(config: AIConfig): AIProvider {
  return metaFor(config.provider).create(config);
}

/** Validate a key against the chosen provider. */
export function validateKey(
  provider: AIProviderId,
  apiKey: string,
  model: string,
): Promise<void> {
  return metaFor(provider).validateKey(apiKey, model);
}

export function defaultModelFor(provider: AIProviderId): string {
  return metaFor(provider).defaultModel;
}
