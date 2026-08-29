import axios from "axios";

export const youtubeDownload = async (req, res) => {
    try {
        const { url, skip, limit } = req.body;

        console.log("=== YouTube Download Request (Render Dispatcher) ===");
        console.log("URL:", url);
        console.log("Skip:", skip);
        console.log("Limit:", limit);

        // 1. Validation
        if (!url || typeof url !== "string" || !url.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid YouTube URL is required."
            });
        }

        const trimmedUrl = url.trim();

        // 2. Sanitize skip and limit
        const parsedSkip = parseInt(skip, 10);
        const parsedLimit = parseInt(limit, 10);
        const safeSkip = !isNaN(parsedSkip) && parsedSkip >= 0 ? String(parsedSkip) : "0";
        const safeLimit = !isNaN(parsedLimit) && parsedLimit >= 1 ? String(parsedLimit) : "1";

        // 3. GitHub repository & token configurations
        const githubToken = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER || "AdwaithAnandSR";
        const repo = process.env.GITHUB_REPO || "musicApp";
        const ref = process.env.GITHUB_BRANCH || process.env.GITHUB_REF || "main";
        const workflowId = process.env.GITHUB_WORKFLOW || "youtube-download.yml";

        if (!githubToken) {
            console.error("Error: GITHUB_TOKEN environment variable is not configured on Render server.");
            return res.status(500).json({
                success: false,
                message: "Server is not configured with GITHUB_TOKEN to trigger download workflows."
            });
        }

        // 4. Trigger GitHub Actions workflow_dispatch
        const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

        console.log(`Dispatching workflow '${workflowId}' to GitHub repo '${owner}/${repo}' on branch '${ref}'...`);

        await axios.post(
            dispatchUrl,
            {
                ref,
                inputs: {
                    url: trimmedUrl,
                    skip: safeSkip,
                    limit: safeLimit
                }
            },
            {
                headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: `Bearer ${githubToken}`,
                    "X-GitHub-Api-Version": "2022-11-28",
                    "User-Agent": "musicApp-Render-API"
                }
            }
        );

        console.log("Successfully dispatched GitHub Actions download workflow.");

        // 5. Immediate response
        return res.status(200).json({
            success: true,
            message: "Download job queued successfully on GitHub Actions worker.",
            details: {
                repository: `${owner}/${repo}`,
                workflow: workflowId,
                branch: ref,
                inputs: {
                    url: trimmedUrl,
                    skip: safeSkip,
                    limit: safeLimit
                }
            }
        });

    } catch (error) {
        console.error("Error triggering YouTube download workflow:", error?.response?.data || error.message);

        const status = error?.response?.status || 500;
        const errorMessage = error?.response?.data?.message || error.message || "Failed to trigger GitHub Actions workflow";

        return res.status(status).json({
            success: false,
            message: `Failed to trigger download worker: ${errorMessage}`
        });
    }
};

export default youtubeDownload;
