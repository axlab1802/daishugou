const { readJson, sendJson } = require("../../../lib/http");
const { getRoom, saveRoom, withRoomLock } = require("../../../lib/roomStore");

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
    const name = String(body.name || "Player").slice(0, 12);

    const result = await withRoomLock(roomCode, async () => {
      const room = await getRoom(roomCode);
      if (!room) {
        return { status: 404, data: { ok: false, error: "ROOM_NOT_FOUND" } };
      }
      if (room.phase !== "lobby") {
        return { status: 409, data: { ok: false, error: "ROOM_ALREADY_STARTED" } };
      }
      if (room.players.length >= room.maxPlayers) {
        return { status: 409, data: { ok: false, error: "ROOM_FULL" } };
      }

      const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
      const now = Date.now();
      room.players.push({
        playerId,
        name,
        joinedAt: now,
        disconnected: false,
        lastSeenAt: now,
      });
      room.stateVersion += 1;
      room.log.push({ at: now, text: `${name} が参加` });

      await saveRoom(room);
      return { status: 200, data: { ok: true, playerId } };
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
