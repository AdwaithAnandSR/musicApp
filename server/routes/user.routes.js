import User from "../models/users.js";
import express from "express";
const router = express.Router();

router.post("/delete", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId)
            return res
                .status(400)
                .json({ success: false, message: "userId is required" });

        // Prevent admins from deleting themselves
        if (userId === req.user.id)
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });

        const user = await User.findByIdAndDelete(userId);

        if (!user)
            return res
                .status(404)
                .json({ success: false, message: "User not found" });

        res.json({ success: true, message: `User "${user.username}" deleted` });
    } catch (error) {
        console.error("deleteUser error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// POST /users/verify  (requires admin)
// Body: { userId: string, isVerified: boolean }
router.post("/verify", async (req, res) => {
    try {
        const { userId, isVerified } = req.body;

        if (!userId || typeof isVerified !== "boolean")
            return res.status(400).json({
                success: false,
                message: "userId and isVerified (boolean) are required"
            });

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { isVerified } },
            { new: true }
        ).select("-password -activeToken");

        if (!user)
            return res
                .status(404)
                .json({ success: false, message: "User not found" });

        res.json({ success: true, user });
    } catch (error) {
        console.error("verifyUser error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// await User.findOneAndUpdate(
//     { username: "Adwaith" },
//     { $set: { role: "admin" } }
// );

export default router;
