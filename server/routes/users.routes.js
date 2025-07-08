import express from "express";
const router = express.Router();

import { auth,authenticate, allUsers, nickname } from "../handlers/auth.handler.js";

router.post("/auth", auth);

router.get("/allUsers", allUsers);

router.get("/authenticate", authenticate);

router.get("/nickname", nickname);

export default router;
