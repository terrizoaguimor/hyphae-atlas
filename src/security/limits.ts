export const REQUEST_LIMITS = {
  maxBodyBytes: 16_384,
  maxVerificationBodyBytes: 1_024,
  maxQuestionCharacters: 2_000,
  agentWindowMs: 10 * 60 * 1_000,
  agentRequestsPerWindow: 6,
  globalWindowMs: 60 * 60 * 1_000,
  globalRequestsPerWindow: 40,
  verificationWindowMs: 10 * 60 * 1_000,
  verificationRequestsPerWindow: 30,
  maxConcurrentAgentRequests: 2,
} as const;
