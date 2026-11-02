/**
 * Environment validation helpers
 *
 * Ensure required environment variables are present for the chosen AI provider
 * and warn about important production configuration. This file is intentionally
 * lightweight and safe to call in development.
 */

export function assertEnvConfig(): void {
  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOllama = Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || process.env.OLLAMA_BASE);

  if (provider === "openai" && !hasOpenAI) {
    console.warn("Configuration warning: OPENAI_API_KEY is not set while AI_PROVIDER=openai — continuing in dev mode");
    // In development we won't exit here; runtime calls will attempt available providers or fail gracefully.
  }

  if (provider === "gemini" && !hasGemini) {
    console.warn("Configuration warning: GEMINI_API_KEY is not set while AI_PROVIDER=gemini — continuing in dev mode");
    // In development we won't exit here; runtime calls will attempt available providers or fail gracefully.
  }

  if (provider === "ollama" && !hasOllama) {
    console.warn("Configuration warning: OLLAMA_BASE_URL is not set while AI_PROVIDER=ollama — continuing in dev mode");
    // In development we won't exit here; runtime calls will attempt available providers or fail gracefully.
  }

  if (provider === "auto" && !hasOpenAI && !hasGemini && !hasOllama) {
    console.warn(
      "Configuration warning: No AI provider configured. Running in dev mode without external AI provider — some features may fail at runtime.",
    );
    // Do not exit in development; allow server to start and handle missing providers at request time.
  }

  // Production hints
  if (process.env.NODE_ENV === "production") {
    if (!process.env.REDIS_URL) {
      console.warn("[env] REDIS_URL not set — rate limiting will use in-memory fallback (not recommended for production)");
    }
    if (!process.env.SECRET_KEY) {
      console.warn("[env] SECRET_KEY not set — set a secret for session/token signing in production");
    }
  }

  console.log(
    `[env] provider=${provider} openai=${hasOpenAI} gemini=${hasGemini} ollama=${hasOllama} NODE_ENV=${process.env.NODE_ENV || "development"}`,
  );
}
