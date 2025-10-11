import express from "express";
const router = express.Router();

import User from "../models/users.js";

import { auth,authenticate, allUsers, nickname } from "../handlers/auth.handler.js";

router.post("/auth", auth);

router.get("/allUsers", allUsers);

router.get("/authenticate", authenticate);

router.get("/nickname", nickname);

router.get("/removeAll", async(req, res)=>{
    await User.deleteMany({})
    res.send("deleted all users")
});

export default router;
