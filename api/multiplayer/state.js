const { sendJson } = require("../../lib/http");
const { getRoom, saveRoom, touchRoom } = require("../../lib/roomStore");
const { roomSummary } = require("../../lib/game");

const GLOBAL_ROOM_CODE = "global";
const SEEN_UPDATE_MS = 15000;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const playerId = String(req.query.playerId || "");

  try {
    const room = await getRoom(GLOBAL_ROOM_CODE);
    if (!room) {
      sendJson(res, 404, { ok: false, error: "ROOM_NOT_FOUND" });
      return;
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) {
      sendJson(res, 403, { ok: false, error: "PLAYER_NOT_FOUND" });
      return;
    }

    const now = Date.now();
    let updated = false;
    if (!player.lastSeenAt || now - player.lastSeenAt > SEEN_UPDATE_MS) {
      player.lastSeenAt = now;
      updated = true;
    }

    if (updated) {
      await saveRoom(room);
    } else {
      await touchRoom(GLOBAL_ROOM_CODE);
    }

    const summary = roomSummary(room);
    const yourHand = room.game?.hands[playerId] || [];
    sendJson(res, 200, { ok: true, room: summary, yourHand });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "SERVER_ERROR" });
  }
};
