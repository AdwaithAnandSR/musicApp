import https from "https"

export const streamToBuffer = async stream => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on("data", chunk => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
};

export const getCoverImageBuffer = bestThumbnail => {
    return new Promise((resolve, reject) => {
        https
            .get(bestThumbnail.url, res => {
                const data = [];

                res.on("data", chunk => data.push(chunk));
                res.on("end", () => resolve(Buffer.concat(data)));
                res.on("error", reject);
            })
            .on("error", reject);
    });
};
