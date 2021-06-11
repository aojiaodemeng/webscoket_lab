const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8880 });

let num = 0;
let group = {};

// 多聊天室的功能
// roomId -> 对应相同的roomId进行广播消息
wss.on("connection", function connection(ws) {
  ws.on("message", function (message) {
    console.log("received: %s", message);
    const msgObj = JSON.parse(message);
    if (msgObj.event === "enter") {
      ws.name = msgObj.message;
      ws.roomId = msgObj.roomId;
      if (typeof group[ws.roomId] === "undefined") {
        group[ws.roomId] = 1;
      } else {
        group[ws.roomId]++;
      }
    }
    // ws.send(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.roomId === ws.roomId) {
        msgObj.name = ws.name;
        msgObj.num = group[ws.roomId];
        client.send(JSON.stringify(msgObj));
      }
    });
  });

  ws.on("close", function () {
    if (ws.name) {
      group[ws.name]--;
    }
    let msgObj = {};
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && ws.roomId === client.roomId) {
        msgObj.name = ws.name;
        msgObj.num = group[ws.roomId];
        msgObj.event = "out";
        client.send(JSON.stringify(msgObj));
      }
    });
  });
});
