function cleanText(text) {
    // Step 1: URL decode
    let cleaned = decodeURIComponent(text);

    // Step 2: Remove common prefixes like "primary:Music/Telegram/"
    cleaned = cleaned.replace(/^(.*?\/)+/, ""); // remove anything before the last slash

    // Step 3: Replace visual separators with space
    cleaned = cleaned.replace(/[_\-|•,]/g, " ");

    // Step 4: Remove common noise/search-irrelevant words
    const commonWords = [
        "lyrics",
        "4k",
        "movie",
        "film",
        "video",
        "audio",
        "official",
        "music",
        "boosted",
        "bass",
        "lyric",
        "remix",
        "hd",
        "3d",
        "2k",
        "teaser",
        "trailer",
        "download",
        "09",
        "08",
        "07",
        "06",
        "05",
        "04",
        "04",
        "03",
        "02",
        "01",
        "link",
        "1080p",
        "320kbps",
        "Mp3"
    ];
    const regex = new RegExp(`\\b(${commonWords.join("|")})\\b`, "gi");
    cleaned = cleaned.replace(regex, "");

    // Step 5: Remove special characters
    cleaned = cleaned.replace(/[.,*"'+/?^&${}()|[\]\\]/g, "");

    // Step 6: Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Step 7: Convert to title case
    cleaned = cleaned
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    return cleaned;
}

export default cleanText;
