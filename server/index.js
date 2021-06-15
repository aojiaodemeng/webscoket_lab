const http = require("http");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ noServer: true });
const server = http.createServer();
const jwt = require("jsonwebtoken");
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

    // 鉴权
    if (msgObj.event === "auth") {
      jwt.verify(msgObj.message, "123456781", (err, decode) => {
        if (err) {
          console.log("auth error");
          return;
        } else {
          // 鉴权通过
          console.log(decode);
          ws.isAuth = true;
          return;
        }
      });
    }

    // 拦截非鉴权的请求
    if (!ws.isAuth) {
      ws.send(
        JSON.stringify({
          event: "noauth",
          message: "please auth again",
        })
      );
      return;
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

server.on("upgrade", function upgrade(request, socket, head) {
  // This function is not defined on purpose. Implement it with your own logic.
  // authenticate(request, (err, client) => {
  //   if (err || !client) {
  //     socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
  //     socket.destroy();
  //     return;
  //   }
  console.log(request.headers);

  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit("connection", ws, request);
  });
  // });
});
server.listen(8880, function () {
  console.log("Listening on http://localhost:8880");
});
