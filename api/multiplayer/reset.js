const { sendJson } = require("../../lib/http");
const { deleteRoom, withRoomLock } = require("../../lib/roomStore");

const GLOBAL_ROOM_CODE = "global";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    await withRoomLock(GLOBAL_ROOM_CODE, async () => {
      await deleteRoom(GLOBAL_ROOM_CODE);
    });

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "SERVER_ERROR" });
  }
};
