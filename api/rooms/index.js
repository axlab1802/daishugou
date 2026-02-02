const { readJson, sendJson } = require("../../lib/http");
const { getRoom, saveRoom } = require("../../lib/roomStore");
const {
  loadRuleCatalog,
  getDefaultRuleConfig,
  normalizeRuleConfig,
  createRoom,
} = require("../../lib/game");

const MAX_CREATE_ATTEMPTS = 6;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const body = await readJson(req);
    const name = String(body.ownerName || body.name || "Player").slice(0, 12);
    const maxPlayers = Number(body.maxPlayers || 6);
    const turnTimeLimitSec = body.turnTimeLimitSec || null;

    const catalog = loadRuleCatalog();
    const defaults = getDefaultRuleConfig(catalog);
    const rules = normalizeRuleConfig(catalog, body.rules || defaults);

    let room = null;
    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const candidate = createRoom(name, maxPlayers, turnTimeLimitSec, rules);
      const exists = await getRoom(candidate.roomCode);
      if (!exists) {
        room = candidate;
        break;
      }
    }

    if (!room) {
      sendJson(res, 503, { ok: false, error: "ROOM_CREATE_FAILED" });
      return;
    }

    await saveRoom(room);

    sendJson(res, 200, {
      ok: true,
      roomCode: room.roomCode,
      ownerId: room.ownerId,
      playerId: room.ownerId,
      rules: room.rules,
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: "INVALID_BODY" });
  }
};
