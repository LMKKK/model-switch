export interface ModelConfig {
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_MODEL: string;
  ANTHROPIC_REASONING_MODEL: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL: string;
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
}

export interface CodexConfig {
  BASE_URL: string;
  OPENAI_API_KEY: string;
  CODEX_MODEL: string;
  CODEX_MODEL_PROVIDER: string;
  CODEX_REVIEW_MODEL: string;
  CODEX_REASONING_EFFORT: string;
  CODEX_VERBOSITY: string;
  CODEX_CONTEXT_WINDOW: string;
}

export interface ModelStoreMeta {
  addedAt: string;
  updatedAt: string;
}

export interface ModelStore<T = ModelConfig> {
  models: Record<string, T>;
  meta?: Record<string, ModelStoreMeta>;
}

export type Provider = "claude" | "codex";
