import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map();

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "listRooms") {
      const list = [...rooms.keys()];
      ws.send(JSON.stringify({ type: "rooms", rooms: list }));
      return;
    }

    if (data.type === "join") {
      const { roomId } = data;

      if (!rooms.has(roomId)) rooms.set(roomId, []);

      const players = rooms.get(roomId);

      ws.color = players.length === 0 ? "w" : "b";
      ws.roomId = roomId;

      players.push(ws);

      ws.send(JSON.stringify({ type: "joined", color: ws.color }));

      if (players.length === 2) {
        players.forEach(p =>
          p.send(JSON.stringify({ type: "start", roomId }))
        );
      }

      return;
    }

    if (data.type === "move") {
      const players = rooms.get(ws.roomId) || [];
      players
        .filter(p => p !== ws)
        .forEach(p =>
          p.send(JSON.stringify({ type: "move", move: data.move }))
        );
      return;
    }
  });

  ws.on("close", () => {
    if (!ws.roomId) return;

    const players = rooms.get(ws.roomId) || [];
    const updated = players.filter(p => p !== ws);

    if (updated.length === 0) {
      rooms.delete(ws.roomId);
    } else {
      rooms.set(ws.roomId, updated);
    }
  });
});