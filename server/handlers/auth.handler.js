import User from "../models/users.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username?.trim() || !password)
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });

        if (password.length < 6)
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });

        const exists = await User.findOne({
            username: username.toLowerCase().trim()
        });
        if (exists)
            return res
                .status(409)
                .json({ success: false, message: "Username already taken" });

        const hashed = await bcrypt.hash(password, 12);
        await User.create({
            username: username.toLowerCase().trim(),
            password: hashed
        });

        return res.status(201).json({
            success: true,
            message: "Account created. Waiting for admin verification."
        });
    } catch (error) {
        console.error("register error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /users/login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username?.trim() || !password)
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });

        const user = await User.findOne({
            username: username.toLowerCase().trim()
        });
        if (!user)
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials" });

        if (!user.isVerified)
            return res.status(403).json({
                success: false,
                message: "Account pending admin verification"
            });

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Overwrite activeToken — any previously logged-in device is invalidated
        await User.findByIdAndUpdate(user._id, { activeToken: token });

        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error("login error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /users/logout  (requires auth)
export const logout = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { activeToken: null });
        res.json({ success: true, message: "Logged out" });
    } catch (error) {
        console.error("logout error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /users/me  (requires auth) — used by client on startup to validate stored token
export const me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "-password -activeToken"
        );
        if (!user)
            return res
                .status(404)
                .json({ success: false, message: "User not found" });

        res.json({ success: true, user });
    } catch (error) {
        console.error("me error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /users/allUsers  (requires admin)
export const allUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password -activeToken");
        res.json(users);
    } catch (error) {
        console.error("allUsers error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /users/verify  (requires admin)
// Body: { userId: string, isVerified: boolean }
export const verifyUser = async (req, res) => {
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
};
