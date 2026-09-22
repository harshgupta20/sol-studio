// Shared AI error type, provider-agnostic so every provider client maps its
// HTTP failures onto the same shape the UI understands.

export type AIErrorCode =
  | 'network'
  | 'unauthorized'
  | 'rate_limited'
  | 'overloaded'
  | 'bad_request'
  | 'refusal'
  | 'no_output'
  | 'http';

export class AIError extends Error {
  code: AIErrorCode;
  status: number;
  constructor(message: string, code: AIErrorCode, status = 0) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.status = status;
  }
}
