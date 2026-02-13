const { readJson, sendJson } = require("../../../lib/http");
const { getRoom, saveRoom, withRoomLock } = require("../../../lib/roomStore");
const {
  validatePlay,
  buildFieldMeta,
  checkRevolution,
  activePlayerCount,
  nextActivePlayerId,
  isTequilaCounterPlay,
  isOchokoResetPlay,
  isKanpaiBonusPlay,
  transferRandomCard,
} = require("../../../lib/game");

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

      const playerId = body.playerId;
      const type = body.type;
      const roomPlayer = room.players.find((player) => player.playerId === playerId);
      if (!roomPlayer) {
        return { status: 404, data: { ok: false, error: "PLAYER_NOT_FOUND" } };
      }
      if (room.phase !== "playing" || !room.game) {
        return { status: 409, data: { ok: false, error: "ROOM_NOT_PLAYING" } };
      }
      if (room.game.gameOver) {
        return { status: 409, data: { ok: false, error: "GAME_OVER" } };
      }
      if (room.game.currentTurnPlayerId !== playerId) {
        return { status: 409, data: { ok: false, error: "NOT_YOUR_TURN" } };
      }

      if (type === "pass") {
        if (room.game.field.length === 0) {
          return { status: 409, data: { ok: false, error: "FIELD_EMPTY" } };
        }
        room.game.passCount += 1;
        const active = activePlayerCount(room);
        if (room.game.passCount >= active - 1) {
          room.game.field = [];
          room.game.fieldMeta = null;
          room.game.passCount = 0;
          const nextId =
            room.game.lastPlayedId &&
            !room.game.ranking.includes(room.game.lastPlayedId)
              ? room.game.lastPlayedId
              : nextActivePlayerId(room, playerId);
          room.game.currentTurnPlayerId = nextId;
          room.game.fieldOwnerId = null;
        } else {
          room.game.currentTurnPlayerId = nextActivePlayerId(room, playerId);
        }
        room.stateVersion += 1;
        await saveRoom(room);
        return { status: 200, data: { ok: true, stateVersion: room.stateVersion } };
      }

      if (type !== "play") {
        return { status: 400, data: { ok: false, error: "INVALID_ACTION" } };
      }

      const cardIds = Array.isArray(body.cardIds) ? body.cardIds : [];
      const hand = room.game.hands[playerId] || [];
      const cardMap = new Map(hand.map((card) => [card.id, card]));
      const cards = [];
      for (const id of cardIds) {
        const card = cardMap.get(id);
        if (!card) {
          return { status: 409, data: { ok: false, error: "CARD_NOT_OWNED" } };
        }
        cards.push(card);
      }

      const validation = validatePlay(cards, room.game, room.rules);
      if (!validation.ok) {
        return {
          status: 409,
          data: { ok: false, error: "INVALID_PLAY", reason: validation.reason },
        };
      }

      const previousField = room.game.field;
      const previousPlayerId = room.game.lastPlayedId;
      const remaining = hand.filter((card) => !cardIds.includes(card.id));
      room.game.hands[playerId] = remaining;
      room.game.field = cards;
      room.game.fieldMeta = buildFieldMeta(cards, validation.combo);
      room.game.fieldOwnerId = playerId;
      room.game.lastPlayedId = playerId;
      room.game.passCount = 0;

      const triggers = [];

      if (validation.combo) {
        triggers.push({ type: "combo", name: validation.combo.name, effect: validation.combo.effect, ruleId: validation.combo.ruleId || null });
      }

      if (checkRevolution(cards)) {
        room.game.revolution = !room.game.revolution;
        triggers.push({ type: "revolution", name: room.game.revolution ? "🔥革命！" : "革命返し！" });
      }

      const tequilaCounterTriggered = isTequilaCounterPlay(
        cards,
        previousField,
        room.rules
      );
      if (tequilaCounterTriggered && previousPlayerId) {
        transferRandomCard(room, playerId, previousPlayerId);
        triggers.push({ type: "rule", ruleId: "tequilaCounter", name: "テキーラ返し！" });
      }

      const ochokoResetTriggered = isOchokoResetPlay(cards, room.rules);
      const kanpaiBonusTriggered = isKanpaiBonusPlay(
        cards,
        previousField,
        room.rules
      );
      if (ochokoResetTriggered) {
        triggers.push({ type: "rule", ruleId: "ochokoReset", name: "おちょこリセット！" });
      } else if (kanpaiBonusTriggered) {
        triggers.push({ type: "rule", ruleId: "kanpaiBonus", name: "乾杯ボーナス！" });
      }

      const updatedHand = room.game.hands[playerId] || [];
      if (updatedHand.length === 0 && !room.game.ranking.includes(playerId)) {
        room.game.ranking.push(playerId);
        const rp = room.players.find((p) => p.playerId === playerId);
        triggers.push({ type: "finish", name: `${rp ? rp.name : ""} 上がり！` });
      }

      if (activePlayerCount(room) <= 1) {
        room.game.gameOver = true;
        room.phase = "finished";
        room.log.push({ at: Date.now(), text: "ゲーム終了" });
        room.stateVersion += 1;
        room.game.lastTriggers = triggers;
        await saveRoom(room);
        return { status: 200, data: { ok: true, stateVersion: room.stateVersion, triggers } };
      }

      if (updatedHand.length > 0 && (ochokoResetTriggered || kanpaiBonusTriggered)) {
        room.game.field = [];
        room.game.fieldMeta = null;
        room.game.fieldOwnerId = null;
        room.game.passCount = 0;
        room.game.currentTurnPlayerId = playerId;
      } else {
        room.game.currentTurnPlayerId = nextActivePlayerId(room, playerId);
      }

      room.stateVersion += 1;
      room.game.lastTriggers = triggers;
      await saveRoom(room);
      return { status: 200, data: { ok: true, stateVersion: room.stateVersion, triggers } };
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
