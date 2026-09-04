import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing required env var: GEMINI_API_KEY");
}

// Single shared client instance for the whole process.
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ---- Config (all overridable via env, sane defaults) ----------------------

export const CONFIG = {
    batchSize: parseInt(process.env.AI_BATCH_SIZE || "10", 10),
    delayMs: parseInt(process.env.AI_DELAY_MS || "2000", 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
    staleProcessingMinutes: parseInt(process.env.AI_STALE_PROCESSING_MINUTES || "15", 10),
    analysisModel: process.env.AI_ANALYSIS_MODEL || "gemini-3.1-pro-preview",
    // Gemini 3.1 Pro can't disable thinking (defaults to HIGH). For a bulk
    // classification-style task like this, LOW keeps latency/cost down —
    // bump to "medium"/"high" via env if you notice quality issues.
    thinkingLevel: process.env.AI_THINKING_LEVEL || "low",
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "gemini-embedding-001",
    // gemini-embedding-001 supports Matryoshka (MRL) truncation, so a smaller
    // dimension is a valid, supported way to shrink both document size and
    // Atlas vector-index RAM usage, at some cost to fine-grained nuance.
    // 256 is plenty for coarse mood/language/genre-style queries like
    // "feel good malayalam" — bump it back up only if you notice recall
    // problems on more specific queries.
    embeddingDimensions: parseInt(process.env.AI_EMBEDDING_DIMENSIONS || "256", 10)
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn` with exponential backoff retry.
 * Only retries on errors that look transient (rate limits, timeouts, 5xx).
 * Permanent-looking errors (bad request, auth, invalid argument) fail fast.
 */
export async function withRetry(fn, { maxRetries = CONFIG.maxRetries, baseDelayMs = 1000, label = "operation" } = {}) {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        } catch (err) {
            attempt += 1;
            if (!isRetryableError(err) || attempt > maxRetries) {
                throw err;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            console.warn(`   ⚠ ${label} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${safeErrorMessage(err)}`);
            await sleep(delay);
        }
    }
}

function isRetryableError(err) {
    const status = err?.status || err?.code || err?.response?.status;
    const message = safeErrorMessage(err).toLowerCase();

    // Explicit HTTP-style status codes
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
        return true;
    }

    // Common transient-error keywords from Gemini / network layer
    const transientKeywords = [
        "rate limit",
        "resource_exhausted",
        "resource exhausted",
        "unavailable",
        "deadline",
        "timeout",
        "econnreset",
        "etimedout",
        "temporarily",
        "internal error"
    ];
    if (transientKeywords.some((kw) => message.includes(kw))) {
        return true;
    }

    // Explicit permanent errors — never retry these
    const permanentKeywords = ["invalid_argument", "invalid argument", "permission_denied", "unauthenticated", "api key not valid", "not_found"];
    if (permanentKeywords.some((kw) => message.includes(kw))) {
        return false;
    }

    // Default: unknown errors are treated as non-retryable to avoid
    // hammering the API on bugs (e.g. a malformed prompt).
    return false;
}

// Strips anything that could resemble the API key out of error messages before logging.
export function safeErrorMessage(err) {
    const raw = err?.message || String(err);
    if (!process.env.GEMINI_API_KEY) return raw;
    return raw.split(process.env.GEMINI_API_KEY).join("[REDACTED]");
}

// JSON Schema used to force Gemini's structured output for song analysis.
export const SONG_ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        language: { type: Type.STRING, description: "Primary language of the song, e.g. Malayalam, Tamil, English" },
        moods: { type: Type.ARRAY, items: { type: Type.STRING } },
        themes: { type: Type.ARRAY, items: { type: Type.STRING } },
        genres: { type: Type.ARRAY, items: { type: Type.STRING } },
        situations: { type: Type.ARRAY, items: { type: Type.STRING } },
        energy: { type: Type.STRING, enum: ["low", "medium", "high"] },
        description: { type: Type.STRING, description: "Rich semantic description of the song for search/recommendation purposes" },
        searchText: { type: Type.STRING, description: "Dense keyword-rich text summarizing the song for semantic search" }
    },
    required: ["language", "moods", "themes", "genres", "situations", "energy", "description", "searchText"],
    propertyOrdering: ["language", "moods", "themes", "genres", "situations", "energy", "description", "searchText"]
};
