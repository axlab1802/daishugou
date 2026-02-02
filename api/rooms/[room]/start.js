const { readJson, sendJson } = require("../../../lib/http");
const { getRoom, saveRoom, withRoomLock } = require("../../../lib/roomStore");
const { createDeck, shuffle, pickFirstPlayerId } = require("../../../lib/game");

function cardsPerPlayer(playerCount) {
  const maxPer = Math.floor((52 + 1) / playerCount);
  return Math.min(10, Math.max(1, maxPer));
}

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

    const result = await withRoomLock(roomCode, async () => {
      const room = await getRoom(roomCode);
      if (!room) {
        return { status: 404, data: { ok: false, error: "ROOM_NOT_FOUND" } };
      }
      if (body.ownerId !== room.ownerId) {
        return { status: 403, data: { ok: false, error: "NOT_OWNER" } };
      }
      if (room.players.length < 2) {
        return { status: 409, data: { ok: false, error: "NOT_ENOUGH_PLAYERS" } };
      }

      const deck = shuffle(createDeck());
      const dealCount = cardsPerPlayer(room.players.length);
      room.game = {
        hands: {},
        field: [],
        fieldMeta: null,
        fieldOwnerId: null,
        lastPlayedId: null,
        currentTurnPlayerId: null,
        revolution: false,
        turnDeadlineAt: null,
        gameOver: false,
        ranking: [],
        passCount: 0,
      };
      room.players.forEach((player) => {
        room.game.hands[player.playerId] = deck.splice(0, dealCount);
      });
      room.game.currentTurnPlayerId = pickFirstPlayerId(room);
      room.phase = "playing";
      room.stateVersion += 1;
      room.log.push({ at: Date.now(), text: "ゲーム開始" });

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
