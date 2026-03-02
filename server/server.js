const express = require("express");
const { ExpressPeerServer } = require("peer");

const app = express();
const port = process.env.PORT || 9000;

// Health check for Render
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "aventura-peer-server" });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`PeerJS server running on port ${port}`);
});

const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: false,
  alive_timeout: 60000,
  cleanup_out_msgs: 1000,
  corsOptions: { origin: "*" },
});

app.use("/peerjs", peerServer);

peerServer.on("connection", (client) => {
  console.log(`Peer connected: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`Peer disconnected: ${client.getId()}`);
});
