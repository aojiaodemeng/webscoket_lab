const http = require("http");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ noServer: true });
const server = http.createServer();
const jwt = require("jsonwebtoken");

const TIME_INTERVAL = 1000;

let group = {};

// 多聊天室的功能
// roomId -> 对应相同的roomId进行广播消息
wss.on("connection", function connection(ws) {
  // 初始的心跳连接状态
  ws.isAlive = true;
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
      jwt.verify(msgObj.message, "12345678", (err, decode) => {
        if (err) {
          console.log("auth error");
          ws.send(
            JSON.stringify({
              event: "noauth",
              message: "please auth again",
            })
          );
          return;
        } else {
          // 鉴权通过
          console.log(decode);
          ws.isAuth = true;
          return;
        }
      });
      return;
    }

    // 拦截非鉴权的请求
    if (!ws.isAuth) {
      return;
    }
    // 心跳检测
    if (msgObj.event === "heartbeat" && msgObj.message === "pong") {
      ws.isAlive = true;
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

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      group[ws.roomId]--;
      return ws.terminate();
    }
    // 主动发送心跳检测请求
    // 当客户端返回了消息之后，主动设置flag为在线
    ws.isAlive = false;
    ws.send(
      JSON.stringify({
        event: "heartbeat",
        message: "ping",
        num: group[ws.roomId],
      })
    );
  });
}, TIME_INTERVAL);
