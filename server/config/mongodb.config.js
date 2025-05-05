const mongoose = require("mongoose");
let pass = process.env.MONGODB_PASS;
let dbName = "vividMusic";
let uri = `mongodb+srv://AdwaithAnandSR:${pass}@cluster0.8os2c.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

try {
   mongoose
      .connect(uri)
      .then(() => console.log("connected to mongodb: ", dbName));
} catch (error) {
   console.log(`error connecting database: `, error);
}

module.exports = mongoose;
