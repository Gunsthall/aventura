const express = require("express");
const { ExpressPeerServer } = require("peer");
const http = require("http");

const port = process.env.PORT || 9000;

const app = express();
const server = http.createServer(app);

// Health endpoint — used by client wake-up pings and platform health checks
app.get("/health", (_req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.json({ status: "ok", timestamp: Date.now() });
});

const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: false,
  alive_timeout: 60000,
  cleanup_out_msgs: 1000,
  corsOptions: { origin: "*" },
});

app.use("/peer", peerServer);

peerServer.on("connection", (client) => {
  console.log(`Peer connected: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`Peer disconnected: ${client.getId()}`);
});

server.listen(port, () => {
  console.log(`PeerJS server running on port ${port}`);
});
