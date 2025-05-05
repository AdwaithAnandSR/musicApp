const express = require("express");
const router = express.Router();

const musicModel = require("../models/musics.js");

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

module.exports = router;
