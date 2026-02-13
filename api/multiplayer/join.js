const { readJson, sendJson } = require("../../lib/http");
const { getRoom, saveRoom, withRoomLock } = require("../../lib/roomStore");
const { 
  loadRuleCatalog,
  getDefaultRuleConfig,
  normalizeRuleConfig,
  createRoom,
  roomSummary
} = require("../../lib/game");

const GLOBAL_ROOM_CODE = "global";
const MAX_PLAYERS = 6;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const body = await readJson(req);
    const name = String(body.name || "Player").slice(0, 12);

    const result = await withRoomLock(GLOBAL_ROOM_CODE, async () => {
      let room = await getRoom(GLOBAL_ROOM_CODE);
      
      // ルームが存在しない場合は作成
      if (!room) {
        const catalog = loadRuleCatalog();
        const defaults = getDefaultRuleConfig(catalog);
        const rules = normalizeRuleConfig(catalog, defaults);
        
        room = createRoom(name, MAX_PLAYERS, null, rules);
        room.roomCode = GLOBAL_ROOM_CODE;
      }
      
      // ゲームが既に開始している場合は参加不可
      if (room.phase !== "lobby") {
        return { status: 409, data: { ok: false, error: "GAME_ALREADY_STARTED" } };
      }
      
      // 満員かチェック
      if (room.players.length >= MAX_PLAYERS) {
        return { status: 409, data: { ok: false, error: "ROOM_FULL" } };
      }
      
      // 既に同じ名前のプレイヤーがいるかチェック
      const existingPlayer = room.players.find(p => p.name === name);
      if (existingPlayer) {
        return { status: 409, data: { ok: false, error: "NAME_ALREADY_EXISTS" } };
      }
      
      // プレイヤーを追加
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
      
      // 2人以上集まったら自動でゲーム開始
      if (room.players.length >= 2 && room.phase === "lobby") {
        const { startGame } = require("../../lib/game");
        startGame(room);
      }
      
      await saveRoom(room);
      
      return { 
        status: 200, 
        data: { 
          ok: true, 
          playerId,
          ownerId: room.ownerId,
          room: roomSummary(room)
        } 
      };
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
