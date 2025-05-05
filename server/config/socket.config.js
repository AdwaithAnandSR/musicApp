// socket.js
const { Server } = require("socket.io");

let io;
function init(server) {
   io = new Server(server, {
      cors: {
         origin: "*"
      }
   });
   return io;
}

function getIo() {
   if (!io) {
      throw new Error(
         "Socket.io not initialized. Please call init(server) first."
      );
   }
   return io;
}

module.exports = { init, getIo };
