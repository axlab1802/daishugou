const { readJson, sendJson } = require("../../lib/http");
const { getRoom, saveRoom, withRoomLock } = require("../../lib/roomStore");

const GLOBAL_ROOM_CODE = "global";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const body = await readJson(req);
    const playerId = String(body.playerId || "");

    if (!playerId) {
      sendJson(res, 400, { ok: false, error: "PLAYER_ID_REQUIRED" });
      return;
    }

    const result = await withRoomLock(GLOBAL_ROOM_CODE, async () => {
      const room = await getRoom(GLOBAL_ROOM_CODE);
      if (!room) {
        return { status: 404, data: { ok: false, error: "ROOM_NOT_FOUND" } };
      }

      const index = room.players.findIndex((p) => p.playerId === playerId);
      if (index === -1) {
        return { status: 404, data: { ok: false, error: "PLAYER_NOT_FOUND" } };
      }

      const name = room.players[index].name;
      room.players.splice(index, 1);
      room.stateVersion += 1;
      room.log.push({ at: Date.now(), text: `${name} が退出` });

      await saveRoom(room);

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
