const UserModel = require("../models/users.js");
const bcrypt = require('bcryptjs');

const signup = async (req, res) => {
   let { username, password } = req.body;
   username = username.trim();
   password = password.trim();
   if (!username || !password) return;
   const existUser = await UserModel.findOne({ username });
   if (existUser)
      return res.status(400).json({
         success: false,
         message: "username already exist. try login..."
      });

   const salt = await bcrypt.genSalt(10);
   const hash = await bcrypt.hash(password, salt);
   const user = await UserModel.create({
      username,
      password: hash
   });
   if (user) {
      return res.status(200).json({
         success: true,
         message: "authentication successfull.",
         user
      });
   }
};

const signin = async (req, res) => {
   let { username, password } = req.body;
   username = username.trim();
   password = password.trim();
   const user = await UserModel.findOne({ username });
   if (!user)
      return res.status(401).json({
         success: false,
         message: "invalid username!"
      });
   const isPassMatch = await bcrypt.compare(password, user.password);
   if (!isPassMatch)
      return res.status(400).json({
         success: false,
         message: "invalid password!"
      });

   return res.status(200).json({
      success: true,
      message: "authentication successfull.",
      user
   });
};

module.exports = { signin, signup };
