const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { getRoom, saveRoom, deleteRoom, touchRoom, withRoomLock } = require("./lib/roomStore");
const { 
  loadRuleCatalog,
  getDefaultRuleConfig,
  normalizeRuleConfig,
  createRoom,
  roomSummary
} = require("./lib/game");
const { readJson, sendJson } = require("./lib/http");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = __dirname;

const SUITS = ["♠", "♥", "♦", "♣"];
const JOKER_RANK = 16;
const JOKER_CARD = {
  id: "joker",
  rank: JOKER_RANK,
  displayRank: "JOKER",
  name: "ジョーカー",
  emoji: "🃏",
  suit: "joker",
  colors: ["#1f2937", "#111827"],
};

const CARD_SPECS = [
  { rank: 3, name: "水", emoji: "💧", colors: ["#87CEEB", "#5F9EA0"] },
  { rank: 4, name: "お茶割り", emoji: "🍵", colors: ["#98D8AA", "#6BBF85"] },
  { rank: 5, name: "炭酸割り", emoji: "🫧", colors: ["#B8E8FC", "#82C8E8"] },
  { rank: 6, name: "レモンサワー", emoji: "🍋", colors: ["#FFF176", "#FFEB3B"] },
  { rank: 7, name: "ビール", emoji: "🍺", colors: ["#FFD93D", "#F5C400"] },
  { rank: 8, name: "ハイボール", emoji: "🥂", colors: ["#FFCC80", "#FFB74D"] },
  { rank: 9, name: "ワイン", emoji: "🍷", colors: ["#E8A0BF", "#D67BA0"] },
  { rank: 10, name: "日本酒", emoji: "🍶", colors: ["#C4DFDF", "#9FC5C5"] },
  { rank: 11, name: "焼酎", emoji: "🫗", colors: ["#ADA2FF", "#8B7FD4"] },
  { rank: 12, name: "ウイスキー", emoji: "🥃", colors: ["#D4A373", "#B8864A"] },
  { rank: 13, name: "テキーラ", emoji: "🍸", colors: ["#FF6B6B", "#E84545"] },
  { rank: 14, name: "スピリタス", emoji: "🔥", colors: ["#FF5722", "#E64A19"] },
  { rank: 15, name: "kiyoshi", emoji: "👴", colors: ["#FFD700", "#FFA500"] },
];

const RULES_PATH = path.join(__dirname, "rules.json");
const RULE_CATALOG = loadRuleCatalog();
const DEFAULT_RULES = getDefaultRuleConfig(RULE_CATALOG);

const COMBOS = [
  {
    id: "tequila-shot",
    name: "テキーラショット",
    requires: { 13: 2 },
    beats: (field) => fieldMatchesRankCount(field, 15, [1]),
    effect: "俺も付き合うわ",
  },
  {
    id: "water-assault",
    name: "水攻め",
    requires: { 3: 3 },
    beats: (field) =>
      fieldMatchesRankCount(field, 13, [1, 2]) ||
      fieldMatchesRankCount(field, 14, [1, 2]),
    effect: "酔い覚ましじゃ",
  },
  {
    id: "kiyoshi-sleep",
    name: "kiyoshiを寝かす",
    requires: { 3: 1, 4: 1 },
    beats: (field) => fieldMatchesRankCount(field, 15, [1]),
    effect: "そろそろ寝てください",
  },
  {
    id: "champong",
    name: "ちゃんぽん",
    requires: { 7: 1, 9: 1 },
    beats: (field) =>
      fieldMatchesRankCount(field, 10, [2]) ||
      fieldMatchesRankCount(field, 11, [2]),
    effect: "混ぜると危険",
  },
  {
    id: "unlock-rock",
    name: "ロック解除",
    requires: { 12: 1, 3: 1 },
    beats: (field) => fieldMatchesRankCount(field, 12, [2]),
    effect: "水割りの方が飲める",
  },
  {
    id: "last-tea",
    name: "〆のお茶",
    requires: { 4: 4 },
    beats: (field) => field.length > 0,
    effect: "はいはい終電終電",
  },
  {
    id: "muddy-drunk",
    name: "泥酔コンボ",
    requires: { 11: 2, 12: 1 },
    beats: (field) => fieldMatchesRankCount(field, 15, [2]),
    effect: "限界突破",
  },
  {
    id: "care-set",
    name: "介抱セット",
    requires: { 3: 1, 4: 1, 5: 1 },
    beats: (field) => fieldMatchesRankCount(field, 14, [1]),
    effect: "もう飲ませられない",
  },
];

const RULE_COMBOS = {
  tequilaCounter: {
    id: "tequila-counter",
    name: "テキーラ返し",
    requires: { 3: 2 },
    beats: (field) => fieldMatchesRankCount(field, 13, [1]),
    effect: "ランダム1枚送付",
    ruleId: "tequilaCounter",
  },
};

function loadRuleCatalog() {
  try {
    const raw = fs.readFileSync(RULES_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.rules)) {
      return data.rules;
    }
  } catch (error) {
    // ignore
  }
  return [
    {
      id: "tequilaCounter",
      name: "テキーラ返し",
      description: "テキーラ単騎後に水2枚で返すとランダム1枚送付",
      defaultEnabled: true,
      implemented: true,
    },
    {
      id: "ochokoReset",
      name: "おちょこリセット",
      description: "日本酒3枚で場流しして同じプレイヤーから再開",
      defaultEnabled: true,
      implemented: true,
    },
    {
      id: "kanpaiBonus",
      name: "乾杯ボーナス",
      description: "ビール単騎の次にワイン単騎で場流し＆連続ターン",
      defaultEnabled: true,
      implemented: true,
    },
  ];
}

function getDefaultRuleConfig(catalog) {
  return catalog.reduce((acc, rule) => {
    acc[rule.id] = Boolean(rule.defaultEnabled);
    return acc;
  }, {});
}

function normalizeRuleConfig(catalog, baseConfig) {
  const normalized = {};
  catalog.forEach((rule) => {
    const raw = baseConfig && typeof baseConfig[rule.id] === "boolean";
    normalized[rule.id] = raw ? baseConfig[rule.id] : Boolean(rule.defaultEnabled);
    if (!rule.implemented) {
      normalized[rule.id] = false;
    }
  });
  return normalized;
}

function isRuleEnabled(rules, id) {
  return Boolean(rules && rules[id]);
}

function getActiveCombos(rules) {
  const combos = [...COMBOS];
  if (isRuleEnabled(rules, "tequilaCounter")) {
    combos.push(RULE_COMBOS.tequilaCounter);
  }
  return combos;
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createDeck() {
  const deck = [];
  CARD_SPECS.forEach((spec) => {
    SUITS.forEach((suit, index) => {
      deck.push({
        id: `${spec.rank}-${index}`,
        rank: spec.rank,
        displayRank: displayRank(spec.rank),
        name: spec.name,
        emoji: spec.emoji,
        suit,
        colors: spec.colors,
      });
    });
  });
  deck.push({ ...JOKER_CARD });
  return deck;
}

function displayRank(rank) {
  if (rank === JOKER_RANK) return "JOKER";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  if (rank === 15) return "2";
  return String(rank);
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function strengthValue(rank, revolution) {
  if (rank === JOKER_RANK) return 999;
  return revolution ? 16 - rank : rank;
}

function isStronger(rankA, rankB, revolution) {
  return strengthValue(rankA, revolution) > strengthValue(rankB, revolution);
}

function fieldMatchesRankCount(field, rank, counts) {
  if (field.length === 0) return false;
  const sameRank = field.every((card) => card.rank === rank);
  if (!sameRank) return false;
  return counts.includes(field.length);
}

function countRanks(cards) {
  return cards.reduce((acc, card) => {
    acc[card.rank] = (acc[card.rank] || 0) + 1;
    return acc;
  }, {});
}

function isAllSameRank(cards) {
  return cards.every((card) => card.rank === cards[0].rank);
}

function getComboMatch(cards, rules) {
  const counts = countRanks(cards);
  return (
    getActiveCombos(rules).find((combo) => {
      const requiredRanks = Object.keys(combo.requires).map((rank) => Number(rank));
      const totalRequired = requiredRanks.reduce(
        (sum, rank) => sum + combo.requires[rank],
        0
      );
      if (totalRequired !== cards.length) return false;
      return requiredRanks.every((rank) => counts[rank] === combo.requires[rank]);
    }) || null
  );
}

function buildFieldMeta(cards, combo) {
  if (combo) {
    const comboStrength = Math.max(...cards.map((card) => card.rank));
    return {
      type: "combo",
      count: cards.length,
      comboStrength,
      comboName: combo.name,
      comboId: combo.id,
    };
  }
  return {
    type: "normal",
    count: cards.length,
    comboStrength: cards[0].rank,
    comboName: null,
    comboId: null,
  };
}

function isTequilaCounterPlay(cards, field, rules) {
  if (!isRuleEnabled(rules, "tequilaCounter")) return false;
  if (!fieldMatchesRankCount(field, 13, [1])) return false;
  if (cards.length !== 2) return false;
  return cards.every((card) => card.rank === 3);
}

function isOchokoResetPlay(cards, rules) {
  if (!isRuleEnabled(rules, "ochokoReset")) return false;
  if (cards.length !== 3) return false;
  return cards.every((card) => card.rank === 10);
}

function isKanpaiBonusPlay(cards, field, rules) {
  if (!isRuleEnabled(rules, "kanpaiBonus")) return false;
  if (!fieldMatchesRankCount(field, 7, [1])) return false;
  if (cards.length !== 1) return false;
  return cards[0].rank === 9;
}

function transferRandomCard(room, fromId, toId) {
  if (!fromId || !toId) return false;
  if (room.game.ranking.includes(fromId) || room.game.ranking.includes(toId)) return false;
  const fromHand = room.game.hands[fromId] || [];
  if (fromHand.length === 0) return false;
  const pickIndex = Math.floor(Math.random() * fromHand.length);
  const [card] = fromHand.splice(pickIndex, 1);
  room.game.hands[fromId] = fromHand;
  room.game.hands[toId] = [...(room.game.hands[toId] || []), card];
  return true;
}

function validatePlay(cards, game, rules) {
  if (cards.length === 0) {
    return { ok: false, reason: "カードを選択してください" };
  }
  if (!game.field || game.field.length === 0) {
    if (!isAllSameRank(cards)) {
      return { ok: false, reason: "場が空の時は同じランクのみ出せます" };
    }
    return { ok: true, combo: null };
  }

  const combo = getComboMatch(cards, rules);
  if (combo && combo.beats(game.field)) {
    return { ok: true, combo };
  }

  if (!isAllSameRank(cards)) {
    return { ok: false, reason: "同じランクのカードを選んでください" };
  }

  if (cards.length !== game.fieldMeta.count) {
    return { ok: false, reason: "場と同じ枚数で出してください" };
  }

  if (!isStronger(cards[0].rank, game.fieldMeta.comboStrength, game.revolution)) {
    return { ok: false, reason: "場より強いカードが必要です" };
  }

  return { ok: true, combo: null };
}

function checkRevolution(cards) {
  if (cards.length !== 4) return false;
  return isAllSameRank(cards);
}

function nextActivePlayerId(room, currentId) {
  const order = room.players.map((player) => player.playerId);
  const finished = new Set(room.game.ranking);
  let index = order.indexOf(currentId);
  if (index === -1) return currentId;
  for (let i = 0; i < order.length; i += 1) {
    index = (index + 1) % order.length;
    if (!finished.has(order[index])) {
      return order[index];
    }
  }
  return currentId;
}

function activePlayerCount(room) {
  const finished = new Set(room.game.ranking);
  return room.players.filter((player) => !finished.has(player.playerId)).length;
}

function pickFirstPlayerId(room) {
  const waterPlayers = room.players.filter((player) =>
    room.game.hands[player.playerId].some((card) => card.rank === 3)
  );
  if (waterPlayers.length === 1) return waterPlayers[0].playerId;
  if (waterPlayers.length > 1) {
    const pick = waterPlayers[Math.floor(Math.random() * waterPlayers.length)];
    return pick.playerId;
  }
  const randomIndex = Math.floor(Math.random() * room.players.length);
  return room.players[randomIndex].playerId;
}

function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return false;

  if (req.method === "POST" && parts[1] === "rooms" && parts.length === 2) {
    readBody(req)
      .then(async (body) => {
        const name = String(body.ownerName || body.name || "Player").slice(0, 12);
        const maxPlayers = Number(body.maxPlayers || 6);
        const turnTimeLimitSec = body.turnTimeLimitSec || null;
        const rules = body.rules || null;
        
        const catalog = loadRuleCatalog();
        const defaults = getDefaultRuleConfig(catalog);
        const normalizedRules = normalizeRuleConfig(catalog, rules || defaults);
        
        const room = createRoom(name, maxPlayers, turnTimeLimitSec, normalizedRules);
        await saveRoom(room);
        
        sendJson(res, 200, {
          ok: true,
          roomCode: room.roomCode,
          ownerId: room.ownerId,
          playerId: room.ownerId,
          rules: room.rules,
        });
      })
      .catch(() => sendJson(res, 400, { ok: false, error: "INVALID_BODY" }));
    return true;
  }

  if (parts[1] === "rooms" && parts.length >= 3) {
    const roomCode = parts[2];
    const room = rooms.get(roomCode);
    if (!room) {
      sendJson(res, 404, { ok: false, error: "ROOM_NOT_FOUND" });
      return true;
    }

    if (req.method === "GET" && parts[3] === "state") {
      const playerId = url.searchParams.get("playerId");
      const player = room.players.find((p) => p.playerId === playerId);
      if (!player) {
        sendJson(res, 403, { ok: false, error: "PLAYER_NOT_FOUND" });
        return true;
      }
      player.lastSeenAt = Date.now();
      const summary = roomSummary(room, playerId);
      const yourHand = room.game?.hands[playerId] || [];
      sendJson(res, 200, { ok: true, room: summary, yourHand });
      return true;
    }

    if (req.method === "POST" && parts[3] === "join") {
      readBody(req)
        .then((body) => {
          if (room.phase !== "lobby") {
            sendJson(res, 409, { ok: false, error: "ROOM_ALREADY_STARTED" });
            return;
          }
          if (room.players.length >= room.maxPlayers) {
            sendJson(res, 409, { ok: false, error: "ROOM_FULL" });
            return;
          }
          const name = String(body.name || "Player").slice(0, 12);
          const playerId = randomId("p");
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
          sendJson(res, 200, { ok: true, playerId });
        })
        .catch(() => sendJson(res, 400, { ok: false, error: "INVALID_BODY" }));
      return true;
    }

    if (req.method === "POST" && parts[3] === "leave") {
      readBody(req)
        .then((body) => {
          const playerId = body.playerId;
          const index = room.players.findIndex((p) => p.playerId === playerId);
          if (index === -1) {
            sendJson(res, 404, { ok: false, error: "PLAYER_NOT_FOUND" });
            return;
          }
          const [removed] = room.players.splice(index, 1);
          room.stateVersion += 1;
          room.log.push({ at: Date.now(), text: `${removed.name} が退出` });
          if (room.players.length === 0) {
            rooms.delete(roomCode);
          }
          sendJson(res, 200, { ok: true });
        })
        .catch(() => sendJson(res, 400, { ok: false, error: "INVALID_BODY" }));
      return true;
    }

    if (req.method === "POST" && parts[3] === "start") {
      readBody(req)
        .then((body) => {
          if (body.ownerId !== room.ownerId) {
            sendJson(res, 403, { ok: false, error: "NOT_OWNER" });
            return;
          }
          if (room.players.length < 2) {
            sendJson(res, 409, { ok: false, error: "NOT_ENOUGH_PLAYERS" });
            return;
          }
          const deck = shuffle(createDeck());
          const dealCount = Math.min(
            10,
            Math.max(1, Math.floor((52 + 1) / room.players.length))
          );
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
          sendJson(res, 200, { ok: true });
        })
        .catch(() => sendJson(res, 400, { ok: false, error: "INVALID_BODY" }));
      return true;
    }

    if (req.method === "POST" && parts[3] === "action") {
      readBody(req)
        .then((body) => {
          const playerId = body.playerId;
          const type = body.type;
          const roomPlayer = room.players.find((p) => p.playerId === playerId);
          if (!roomPlayer) {
            sendJson(res, 404, { ok: false, error: "PLAYER_NOT_FOUND" });
            return;
          }
          if (room.phase !== "playing" || !room.game) {
            sendJson(res, 409, { ok: false, error: "ROOM_NOT_PLAYING" });
            return;
          }
          if (room.game.gameOver) {
            sendJson(res, 409, { ok: false, error: "GAME_OVER" });
            return;
          }
          if (room.game.currentTurnPlayerId !== playerId) {
            sendJson(res, 409, { ok: false, error: "NOT_YOUR_TURN" });
            return;
          }

          if (type === "pass") {
            if (room.game.field.length === 0) {
              sendJson(res, 409, { ok: false, error: "FIELD_EMPTY" });
              return;
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
            sendJson(res, 200, { ok: true, stateVersion: room.stateVersion });
            return;
          }

          if (type !== "play") {
            sendJson(res, 400, { ok: false, error: "INVALID_ACTION" });
            return;
          }

          const cardIds = Array.isArray(body.cardIds) ? body.cardIds : [];
          const hand = room.game.hands[playerId] || [];
          const cardMap = new Map(hand.map((card) => [card.id, card]));
          const cards = [];
          for (const id of cardIds) {
            const card = cardMap.get(id);
            if (!card) {
              sendJson(res, 409, { ok: false, error: "CARD_NOT_OWNED" });
              return;
            }
            cards.push(card);
          }

          const validation = validatePlay(cards, room.game, room.rules);
          if (!validation.ok) {
            sendJson(res, 409, { ok: false, error: "INVALID_PLAY", reason: validation.reason });
            return;
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

          if (checkRevolution(cards)) {
            room.game.revolution = !room.game.revolution;
          }

          const tequilaCounterTriggered = isTequilaCounterPlay(
            cards,
            previousField,
            room.rules
          );
          if (tequilaCounterTriggered && previousPlayerId) {
            transferRandomCard(room, playerId, previousPlayerId);
          }

          const ochokoResetTriggered = isOchokoResetPlay(cards, room.rules);
          const kanpaiBonusTriggered = isKanpaiBonusPlay(
            cards,
            previousField,
            room.rules
          );

          const updatedHand = room.game.hands[playerId] || [];
          if (updatedHand.length === 0 && !room.game.ranking.includes(playerId)) {
            room.game.ranking.push(playerId);
          }

          if (activePlayerCount(room) <= 1) {
            room.game.gameOver = true;
            room.phase = "finished";
            room.log.push({ at: Date.now(), text: "ゲーム終了" });
            room.stateVersion += 1;
            sendJson(res, 200, { ok: true, stateVersion: room.stateVersion });
            return;
          }

          if (
            updatedHand.length > 0 &&
            (ochokoResetTriggered || kanpaiBonusTriggered)
          ) {
            room.game.field = [];
            room.game.fieldMeta = null;
            room.game.fieldOwnerId = null;
            room.game.passCount = 0;
            room.game.currentTurnPlayerId = playerId;
          } else {
            room.game.currentTurnPlayerId = nextActivePlayerId(room, playerId);
          }
          room.stateVersion += 1;
          sendJson(res, 200, { ok: true, stateVersion: room.stateVersion });
        })
        .catch(() => sendJson(res, 400, { ok: false, error: "INVALID_BODY" }));
      return true;
    }
  }

  sendJson(res, 404, { ok: false, error: "NOT_FOUND" });
  return true;
}

function serveStatic(req, res, url) {
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(filePath).replace(/^\.(?=\.)/, "");
  const absolutePath = path.join(PUBLIC_DIR, safePath);
  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(absolutePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(absolutePath);
    const mime =
      {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".json": "application/json",
      }[ext] || "text/plain";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api")) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
