const mongoose = require("mongoose");

const schema = mongoose.Schema({
   username: {
      type: String,
      required: true
   },
   password: {
      type: String,
      required: true
   },
   role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
   }
   
})

module.exports = mongoose.model('user', schema)