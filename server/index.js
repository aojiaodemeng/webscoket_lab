const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8880 });

let num = 0;
wss.on("connection", function connection(ws) {
  ws.on("message", function (message) {
    console.log("received: %s", message);
    const msgObj = JSON.parse(message);
    if (msgObj.event === "enter") {
      ws.name = msgObj.message;
      num++;
    }
    // ws.send(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        msgObj.name = ws.name;
        msgObj.num = num;
        client.send(JSON.stringify(msgObj));
      }
    });
  });

  ws.on("close", function () {
    if (ws.name) {
      num--;
    }
    let msgObj = {};
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        msgObj.name = ws.name;
        msgObj.num = num;
        msgObj.event = "out";
        client.send(JSON.stringify(msgObj));
      }
    });
  });
});
