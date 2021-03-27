const express = require('express');
const cors = require('cors');
const socketApi = require('./socketApi');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const http = require("http");
const _PORT = process.env.PORT;
const options = {
    cors: true,
    origins: [`http://127.0.0.1:${_PORT}`],
    pingTimeout: 60000
  };
app.use(cors());
//Create HTTP server.
const server = http.createServer(app);
app.get('/', (req, res) => {
    res.send('<h1>Hi.. I am Socket.io :)</h1>');
});
server.listen(_PORT, () => console.log("===> Server is Started -- PORT: " + _PORT + " <==="));
//socket attach
const io = require('socket.io')(server, options);
socketApi(io);