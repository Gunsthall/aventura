const { PeerServer } = require("peer");

const port = process.env.PORT || 9000;

const server = PeerServer({
  port,
  path: "/",
  allow_discovery: false,
  alive_timeout: 60000,
  cleanup_out_msgs: 1000,
  corsOptions: {
    origin: "*",
  },
});

server.on("connection", (client) => {
  console.log(`Peer connected: ${client.getId()}`);
});

server.on("disconnect", (client) => {
  console.log(`Peer disconnected: ${client.getId()}`);
});

console.log(`PeerJS server running on port ${port}`);
