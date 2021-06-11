const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8880 });

wss.on("connection", function connection(ws) {
  console.log("connection");
  ws.on("message", function (message) {
    console.log("received: %s", message);
    // ws.send(message);
    wss.clients.forEach((client) => {
      if (ws !== client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});
