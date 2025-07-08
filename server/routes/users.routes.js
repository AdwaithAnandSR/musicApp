import express from "express";
const router = express.Router();

import { auth,authenticate, allUsers } from "../handlers/auth.handler.js";

router.post("/auth", auth);

router.get("/allUsers", allUsers);

router.get("/authenticate", authenticate);

export default router;
