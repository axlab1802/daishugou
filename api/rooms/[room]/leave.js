const { readJson, sendJson } = require("../../../lib/http");
const { getRoom, saveRoom, deleteRoom, withRoomLock } = require("../../../lib/roomStore");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const roomCode = String(req.query.room || "");
  if (!roomCode) {
    sendJson(res, 400, { ok: false, error: "ROOM_CODE_REQUIRED" });
    return;
  }

  try {
    const body = await readJson(req);
    const playerId = body.playerId;

    const result = await withRoomLock(roomCode, async () => {
      const room = await getRoom(roomCode);
      if (!room) {
        return { status: 404, data: { ok: false, error: "ROOM_NOT_FOUND" } };
      }

      const index = room.players.findIndex((player) => player.playerId === playerId);
      if (index === -1) {
        return { status: 404, data: { ok: false, error: "PLAYER_NOT_FOUND" } };
      }

      const [removed] = room.players.splice(index, 1);
      room.stateVersion += 1;
      room.log.push({ at: Date.now(), text: `${removed.name} が退出` });

      if (room.players.length === 0) {
        await deleteRoom(roomCode);
      } else {
        await saveRoom(room);
      }

      return { status: 200, data: { ok: true } };
    });

    if (result && result.error === "ROOM_BUSY") {
      sendJson(res, 409, { ok: false, error: "ROOM_BUSY" });
      return;
    }

    sendJson(res, result.status, result.data);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: "INVALID_BODY" });
  }
};
