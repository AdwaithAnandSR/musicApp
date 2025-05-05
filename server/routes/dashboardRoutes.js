import express from "express"
const router = express.Router();

import musicModel from "../models/musics.js";

router.get("/allSongsData", async (req, res) => {
   
      const data = await musicModel.aggregate([
         {
            $group: {
               _id: { $year: "$createdAt" },
               count: { $sum: 1 }
            }
         },
         {
            $sort: { _id: 1 }
         }
      ]);
      res.json({ data });
   
});

export default router
