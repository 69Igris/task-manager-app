/** Normalized provider failure; `retryable` drives the orchestrator's retry budget. */
export class ProviderError extends Error {
  /**
   * @param {string} message
   * @param {'not_configured'|'auth'|'rate_limited'|'unavailable'|'bad_request'|'timeout'|'unknown'} code
   * @param {boolean} retryable
   */
  constructor(message, code = 'unknown', retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}
