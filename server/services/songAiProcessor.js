import Music from "../models/musics.js";
import {
    ai,
    CONFIG,
    sleep,
    withRetry,
    safeErrorMessage,
    SONG_ANALYSIS_SCHEMA
} from "./geminiClient.js";

// -----------------------------------------------------------------------
// Lyrics extraction
// -----------------------------------------------------------------------

/**
 * Returns plain lyric lines for a song, preferring timestamped `lyrics`
 * (stripping timestamps — Gemini only needs the text), falling back to
 * `lyricsAsText`. Returns null if neither exists.
 */
export function getLyrics(song) {
    if (Array.isArray(song.lyrics) && song.lyrics.length > 0) {
        const lines = song.lyrics
            .map(l => l.line)
            .filter(line => typeof line === "string" && line.trim().length > 0);
        if (lines.length > 0) return lines;
    }
    if (Array.isArray(song.lyricsAsText) && song.lyricsAsText.length > 0) {
        const lines = song.lyricsAsText.filter(
            line => typeof line === "string" && line.trim().length > 0
        );
        if (lines.length > 0) return lines;
    }
    return null;
}

// -----------------------------------------------------------------------
// Gemini analysis
// -----------------------------------------------------------------------

function buildAnalysisPrompt({ title, artist, lyricsLines }) {
    const lyricsBlock = lyricsLines
        ? lyricsLines.join("\n")
        : "(no local lyrics available)";

    return `You are analyzing a song for a semantic music search and recommendation system.

SONG
Title: ${title}
Artist: ${artist || "Unknown"}

LOCAL LYRICS (primary source for lyrical meaning if present):
${lyricsBlock}

You have access to Google Search — use it to find background context about this song
(artist/album context, genre, reception, general theme if local lyrics are missing or
sparse). Do NOT quote or reproduce lyrics verbatim from search results, whether or not
local lyrics are present — describe meaning/themes in your own words only.

INSTRUCTIONS
- Lyrics are the primary source for lyrical meaning when they are available above.
- Web information is supplementary context only (genre, background, reception, etc.).
- Do NOT invent facts. If something is uncertain or not supported by the given text, omit it rather than guessing.
- Identify the primary language (e.g. Malayalam, Tamil, English, Hindi, mixed, etc.).
- Identify mood(s) evoked by the song.
- Identify theme(s) present in the lyrics/content.
- Identify likely genre(s).
- Identify situations/use cases this song fits (e.g. "rainy day", "workout", "romantic evening", "road trip").
- Identify overall energy: low, medium, or high.
- Write a rich, natural-language semantic description useful for search embedding.
- Write a dense, keyword-rich "searchText" combining language, mood, theme, genre, and situation keywords a user might search for.

Respond with JSON matching the required schema only.`;
}

/**
 * Calls Gemini 2.5 Pro to analyze a song and returns validated structured data.
 * Throws on malformed/invalid output so the caller can record ai.error and retry later.
 */
export async function analyzeSong({ title, artist, lyricsLines }) {
    const prompt = buildAnalysisPrompt({ title, artist, lyricsLines });

    const response = await withRetry(
        () =>
            ai.models.generateContent({
                model: CONFIG.analysisModel,
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: SONG_ANALYSIS_SCHEMA,
                    thinkingConfig: { thinkingLevel: CONFIG.thinkingLevel }
                    // No temperature override: Gemini 3 models can loop/degrade
                    // if temperature is pushed below the 1.0 default.
                }
            }),
        { label: "Gemini analysis + search" }
    );

    const raw = response.text;
    if (!raw) {
        throw new Error("Gemini returned empty response");
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Gemini returned malformed JSON: ${err.message}`);
    }

    validateAnalysis(parsed);

    const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
        .map(chunk => ({
            title: chunk.web?.title || "",
            url: chunk.web?.uri || ""
        }))
        .filter(source => source.url);

    return { analysis: parsed, sources };
}

function validateAnalysis(parsed) {
    const requiredStringFields = [
        "language",
        "energy",
        "description",
        "searchText"
    ];
    const requiredArrayFields = ["moods", "themes", "genres", "situations"];

    for (const field of requiredStringFields) {
        if (typeof parsed[field] !== "string" || parsed[field].trim() === "") {
            throw new Error(`Gemini analysis missing/invalid field: ${field}`);
        }
    }
    for (const field of requiredArrayFields) {
        if (!Array.isArray(parsed[field])) {
            throw new Error(
                `Gemini analysis missing/invalid array field: ${field}`
            );
        }
    }
    if (!["low", "medium", "high"].includes(parsed.energy)) {
        throw new Error(
            `Gemini analysis returned invalid energy value: ${parsed.energy}`
        );
    }
}

// -----------------------------------------------------------------------
// Embeddings
// -----------------------------------------------------------------------

function buildEmbeddingText({ title, artist, lyricsLines, analysis }) {
    return [
        `Title: ${title}`,
        `Artist: ${artist || "Unknown"}`,
        `Language: ${analysis.language}`,
        `Moods: ${analysis.moods.join(", ")}`,
        `Themes: ${analysis.themes.join(", ")}`,
        `Genres: ${analysis.genres.join(", ")}`,
        `Situations: ${analysis.situations.join(", ")}`,
        `Energy: ${analysis.energy}`,
        `Description: ${analysis.description}`,
        `Search text: ${analysis.searchText}`,
        lyricsLines ? `Lyrics: ${lyricsLines.join(" ")}` : ""
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * Generates an embedding for arbitrary text. Used both for indexing songs
 * (taskType: RETRIEVAL_DOCUMENT) and for embedding a live search query
 * (taskType: RETRIEVAL_QUERY) — see routes/musicSearch.js.
 */
export async function embedText(text, taskType = "RETRIEVAL_DOCUMENT") {
    const response = await withRetry(
        () =>
            ai.models.embedContent({
                model: CONFIG.embeddingModel,
                contents: text,
                config: {
                    outputDimensionality: CONFIG.embeddingDimensions,
                    taskType
                }
            }),
        { label: "Gemini embedding" }
    );

    const values = response?.embeddings?.[0]?.values;
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Gemini embedding response was empty/invalid");
    }
    return values;
}

// -----------------------------------------------------------------------
// Atomic claim / crash recovery
// -----------------------------------------------------------------------

/**
 * Atomically claims the next unprocessed song using findOneAndUpdate, so
 * running multiple instances of this script concurrently can never process
 * the same song twice. A song is claimable if it's not processed AND it's
 * either never been claimed, or was claimed so long ago (ai.processingAt)
 * that it's considered abandoned (crash recovery).
 */
export async function claimNextSong() {
    const staleThreshold = new Date(
        Date.now() - CONFIG.staleProcessingMinutes * 60 * 1000
    );

    return Music.findOneAndUpdate(
        {
            "ai.processed": { $ne: true },
            $or: [
                { "ai.processing": { $ne: true } },
                { "ai.processingAt": { $lt: staleThreshold } }
            ]
        },
        {
            $set: { "ai.processing": true, "ai.processingAt": new Date() }
        },
        {
            sort: { createdAt: 1 },
            new: true
        }
    );
}

/**
 * Releases songs that have been stuck in ai.processing=true for longer than
 * the stale threshold, without needing them to be re-claimed via
 * claimNextSong first. Useful to run once at the start of a batch run so
 * stats/logging reflect reality, though claimNextSong already handles
 * reclaiming them safely on its own.
 */
export async function releaseStaleProcessing() {
    const staleThreshold = new Date(
        Date.now() - CONFIG.staleProcessingMinutes * 60 * 1000
    );
    const result = await Music.updateMany(
        {
            "ai.processing": true,
            "ai.processingAt": { $lt: staleThreshold },
            "ai.processed": { $ne: true }
        },
        { $set: { "ai.processing": false } }
    );
    if (result.modifiedCount > 0) {
        console.log(
            `   ↺ Released ${result.modifiedCount} stale/abandoned song(s) back to the queue`
        );
    }
    return result.modifiedCount;
}

// -----------------------------------------------------------------------
// Per-song processing
// -----------------------------------------------------------------------

/**
 * Processes a single already-claimed song document end to end:
 * web search -> Gemini analysis -> embedding -> save.
 * Never throws — failures are recorded on the document (ai.error) so the
 * batch loop can move on to the next song.
 */
export async function processSong(song) {
    const label = `${song.title}${song.artist ? " — " + song.artist : ""}`;
    const lyricsLines = getLyrics(song);

    // --- Web search + Gemini analysis (single call) ---
    // Gemini 3.1 Pro supports combining the googleSearch tool with
    // responseSchema in one request, so search + structured analysis
    // happen together — mandatory search, no separate cached "web search"
    // stage needed (unlike Gemini 2.5, which requires two calls).
    let analysis;
    let webSources = [];
    try {
        console.log("   → Gemini analysis (with Google Search)");
        const result = await analyzeSong({
            title: song.title,
            artist: song.artist,
            lyricsLines
        });
        analysis = result.analysis;
        webSources = result.sources;
        console.log(
            `   → Analysis complete (${webSources.length} web source(s) used)`
        );
    } catch (err) {
        const message = safeErrorMessage(err);
        console.error(`   ✗ Gemini analysis failed: ${message}`);
        await Music.updateOne(
            { _id: song._id },
            {
                $set: {
                    "ai.processing": false,
                    "ai.error": `analysis: ${message}`
                }
            }
        );
        return { success: false, stage: "analysis" };
    }

    // --- Embedding ---
    let embedding;
    try {
        console.log("   → Embedding");
        const embeddingText = buildEmbeddingText({
            title: song.title,
            artist: song.artist,
            lyricsLines,
            analysis
        });
        embedding = await embedText(embeddingText, "RETRIEVAL_DOCUMENT");
    } catch (err) {
        const message = safeErrorMessage(err);
        console.error(`   ✗ Embedding failed: ${message}`);
        // Preserve the Gemini analysis (and web sources) we already have so
        // they don't need to be redone — only the embedding step retries.
        await Music.updateOne(
            { _id: song._id },
            {
                $set: {
                    "ai.processing": false,
                    "ai.error": `embedding: ${message}`,
                    "ai.webSearched": true,
                    "ai.webSearchedAt": new Date(),
                    "ai.webSources": webSources,
                    "ai.language": analysis.language,
                    "ai.moods": analysis.moods,
                    "ai.themes": analysis.themes,
                    "ai.genres": analysis.genres,
                    "ai.situations": analysis.situations,
                    "ai.energy": analysis.energy,
                    "ai.description": analysis.description,
                    "ai.searchText": analysis.searchText
                }
            }
        );
        return { success: false, stage: "embedding" };
    }

    // --- Save ---
    console.log("   → Saving");
    await Music.updateOne(
        { _id: song._id },
        {
            $set: {
                "ai.processed": true,
                "ai.processing": false,
                "ai.processedAt": new Date(),
                "ai.webSearched": true,
                "ai.webSearchedAt": new Date(),
                "ai.webSources": webSources,
                "ai.language": analysis.language,
                "ai.moods": analysis.moods,
                "ai.themes": analysis.themes,
                "ai.genres": analysis.genres,
                "ai.situations": analysis.situations,
                "ai.energy": analysis.energy,
                "ai.description": analysis.description,
                "ai.searchText": analysis.searchText,
                "ai.embedding": embedding
            },
            $unset: { "ai.error": "" }
        }
    );
    console.log(`   ✓ Completed (${label})`);
    return { success: true };
}

// -----------------------------------------------------------------------
// Batch orchestration
// -----------------------------------------------------------------------

/**
 * Claims and fully processes up to CONFIG.batchSize songs, strictly
 * sequentially (no Promise.all). Returns the number of songs it attempted.
 */
export async function processSongBatch() {
    await releaseStaleProcessing();

    const claimed = [];
    for (let i = 0; i < CONFIG.batchSize; i++) {
        const song = await claimNextSong();
        if (!song) break;
        console.log("pronessing song ", song.title);
        claimed.push(song);
    }

    if (claimed.length === 0) {
        return 0;
    }

    console.log(
        `\nFound ${claimed.length} song${claimed.length === 1 ? "" : "s"}`
    );

    for (let i = 0; i < claimed.length; i++) {
        const song = claimed[i];
        console.log(`\n[${i + 1}/${claimed.length}] Processing: ${song.title}`);
        await processSong(song);

        const isLast = i === claimed.length - 1;
        if (!isLast && CONFIG.delayMs > 0) {
            await sleep(CONFIG.delayMs);
        }
    }

    console.log("\nBatch completed");
    return claimed.length;
}

/**
 * Repeatedly runs processSongBatch() until no unprocessed songs remain.
 */
export async function processAllSongs() {
    let totalProcessed = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const processedInBatch = await processSongBatch();
        if (processedInBatch === 0) break;
        totalProcessed += processedInBatch;
    }
    console.log(
        `\nAll done. Total songs processed this run: ${totalProcessed}`
    );
    return totalProcessed;
}
