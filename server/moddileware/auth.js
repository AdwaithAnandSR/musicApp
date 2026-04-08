import jwt from "jsonwebtoken";
import User from "../models/users.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer "))
            return res
                .status(401)
                .json({ success: false, message: "No token provided" });

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError")
                return res
                    .status(401)
                    .json({ success: false, message: "Token expired" });
            return res
                .status(401)
                .json({ success: false, message: "Invalid token" });
        }

        // Single-device check: reject if this is not the device that last logged in
        const user = await User.findById(decoded.id).select(
            "activeToken role isVerified"
        );
        if (!user || user.activeToken !== token)
            return res.status(401).json({
                success: false,
                message: "Session expired or signed in from another device"
            });

        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        };
        next();
    } catch (error) {
        console.error("requireAuth error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Server error" });
    }
};

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin")
        return res
            .status(403)
            .json({ success: false, message: "Admin access required" });
    next();
};
