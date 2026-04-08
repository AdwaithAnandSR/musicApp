import express from "express";
const router = express.Router();

import {
    register,
    login,
    logout,
    me,
    allUsers,
    verifyUser
} from "../handlers/auth.handler.js";
import { requireAuth, requireAdmin } from "../moddileware/auth.js";

// ── Public ─────────────────────────────────────────────
router.post("/register", register);
router.post("/login", login);

// ── Authenticated ───────────────────────────────────────
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me); // client uses this on startup to validate stored token

// ── Admin only ──────────────────────────────────────────
router.get("/allUsers", requireAuth, requireAdmin, allUsers);
router.post("/verify", requireAuth, requireAdmin, verifyUser); // { userId, isVerified: true/false }

export default router;
