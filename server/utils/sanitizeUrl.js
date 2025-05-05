const sanitizeYouTubeURL = url => {
    try {
        url = url
            .trim()
            .replace("m.youtube.com", "www.youtube.com")
            .replace("youtu.be/", "www.youtube.com/watch?v=")
            .split("&")[0]; // remove extra query params

        const parsed = new URL(url);
        const videoId = parsed.searchParams.get("v");
        if (!videoId) return null;

        return `https://www.youtube.com/watch?v=${videoId}`;
    } catch {
        return null;
    }
};

export default sanitizeYouTubeURL;
