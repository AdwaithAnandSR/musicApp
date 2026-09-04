import Music from "../models/musics.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const BATCH_SIZE = 10;

function getLyrics(song) {
    if (song.lyrics?.length) {
        return song.lyrics
            .map(x => x.line)
            .filter(Boolean)
            .join("\n");
    }

    if (song.lyricsAsText?.length) {
        return song.lyricsAsText
            .filter(Boolean)
            .join("\n");
    }

    return "";
}

async function searchSong(song) {
    const query = `"${song.title}" "${song.artist}" lyrics song`;

    // Call your chosen search API here.
    // Return the top 3-5 relevant results.

    return [];
}

async function analyzeSong(song, webResults) {
    const lyrics = getLyrics(song);

    const webContext = webResults
        .map((r, i) => `
SOURCE ${i + 1}
Title: ${r.title}
URL: ${r.url}
Snippet: ${r.snippet}
        `)
        .join("\n");

    const prompt = `
You are analyzing a song for a multilingual music
search and recommendation system.

SONG:
Title: ${song.title}
Artist: ${song.artist}

DATABASE LYRICS:
${lyrics || "(No lyrics available)"}

WEB INFORMATION:
${webContext || "(No web results)"}

Analyze the song.

Use the lyrics as the primary source for lyrical
meaning when available.

Use web information to supplement:
- language
- movie/album context
- genre
- mood
- themes
- situations
- other useful information.

Do NOT invent facts.

This data will be used for semantic music search.

Return JSON with exactly this structure:

{
  "language": "Malayalam",
  "moods": [],
  "themes": [],
  "genres": [],
  "situations": [],
  "energy": "low|medium|high",
  "description": "",
  "searchText": ""
}

The searchText should be a rich semantic description
that helps match queries such as:

"feel good Malayalam"
"romantic rainy songs"
"sad breakup songs"
"peaceful songs"
"travel songs"
"happy Tamil songs"

Do not include unsupported information.
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text);
}

function createEmbeddingText(song, analysis, lyrics) {
    return `
Title: ${song.title}
Artist: ${song.artist}

Language: ${analysis.language}

Moods: ${analysis.moods.join(", ")}
Themes: ${analysis.themes.join(", ")}
Genres: ${analysis.genres.join(", ")}
Situations: ${analysis.situations.join(", ")}
Energy: ${analysis.energy}

Description:
${analysis.description}

Semantic description:
${analysis.searchText}

Lyrics:
${lyrics}
`;
}

async function createEmbedding(text) {
    const response = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: text
    });

    return response.embeddings[0].values;
}

async function processSong(song) {
    console.log(`\nProcessing: ${song.title}`);

    await Music.updateOne(
        { _id: song._id },
        {
            $set: {
                "ai.processing": true,
                "ai.error": null
            }
        }
    );

    try {
        // 1. Mandatory web search
        console.log("  → Web search");

        const webResults = await searchSong(song);

        // 2. Get local lyrics
        const lyrics = getLyrics(song);

        // 3. Gemini analysis
        console.log("  → Gemini Pro");

        const analysis = await analyzeSong(
            song,
            webResults
        );

        // 4. Embedding
        console.log("  → Embedding");

        const embeddingText = createEmbeddingText(
            song,
            analysis,
            lyrics
        );

        const embedding =
            await createEmbedding(embeddingText);

        // 5. Save
        await Music.updateOne(
            { _id: song._id },
            {
                $set: {
                    ai: {
                        processed: true,
                        processing: false,
                        processedAt: new Date(),

                        language: analysis.language,

                        moods: analysis.moods,
                        themes: analysis.themes,
                        genres: analysis.genres,
                        situations: analysis.situations,

                        energy: analysis.energy,

                        description: analysis.description,

                        searchText: analysis.searchText,

                        embedding,

                        webSources: webResults,

                        error: null
                    }
                }
            }
        );

        console.log(`  ✓ Completed: ${song.title}`);

    } catch (error) {

        console.error(
            `  ✗ Failed: ${song.title}`,
            error
        );

        await Music.updateOne(
            { _id: song._id },
            {
                $set: {
                    "ai.processing": false,
                    "ai.error":
                        error?.message || String(error)
                }
            }
        );
    }
}

export async function processSongBatch() {

    const songs = await Music.find({
        $or: [
            { "ai.processed": { $ne: true } },
            {
                "ai.processed": false,
                "ai.processing": false
            }
        ]
    })
        .sort({ createdAt: 1 })
        .limit(BATCH_SIZE);

    console.log(
        `Found ${songs.length} songs`
    );

    for (const song of songs) {

        // IMPORTANT:
        // sequential, not Promise.all()

        await processSong(song);
    }

    return songs.length;
}

export async function processAllSongs() {

    while (true) {

        const count = await processSongBatch();

        if (count === 0) {
            console.log(
                "No unprocessed songs remaining."
            );

            break;
        }

        console.log(
            `Batch completed: ${count} songs`
        );
    }
}

import mongoose from "mongoose";
import { processAllSongs } from "../services/songAiProcessor.js";

await mongoose.connect(process.env.MONGODB_URI);

try {
    await processAllSongs();
} finally {
    await mongoose.disconnect();
}

