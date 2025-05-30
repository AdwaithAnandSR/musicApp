function cleanText(text) {
    // Replace visual separators with space
    let cleaned = text.replace(/[_\-|•]/g, " ");

    // Remove common noise/search-irrelevant words
    const commonWords = [
        "songs",
        "song",
        "lyrics",
        "malayalam",
        "tamil",
        "hindi",
        "telugu",
        "kannada",
        "4k",
        "movie",
        "film",
        "video",
        "audio",
        "Official",
        "music",
        "musics",
        "boosted",
        "bass",
        "lyric",
        "lyrics",
        "remix",
    ];
    const regex = new RegExp(`\\b(${commonWords.join("|")})\\b`, "gi");
    cleaned = cleaned.replace(regex, "");

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Escape regex special characters so it can be used in search safely
    cleaned = cleaned.replace(/[.,*"'+/?^&${}()|[\]\\]/g, "");

    return cleaned;
}

export default cleanText;
