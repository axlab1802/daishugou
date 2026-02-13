const fs = require("fs");
const path = require("path");

const SUITS = ["♠", "♥", "♦", "♣"];
const COPIES_PER_CARD = 8;
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

const RULES_PATH = path.join(process.cwd(), "rules.json");

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

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createDeck() {
  const deck = [];
  CARD_SPECS.forEach((spec) => {
    for (let i = 0; i < COPIES_PER_CARD; i++) {
      const suit = SUITS[i % SUITS.length];
      deck.push({
        id: `${spec.rank}-${i}`,
        rank: spec.rank,
        displayRank: displayRank(spec.rank),
        name: spec.name,
        emoji: spec.emoji,
        suit,
        colors: spec.colors,
      });
    }
  });
  deck.push({ ...JOKER_CARD });
  return deck;
}

function startGame(room) {
  if (room.phase !== "lobby" || room.players.length < 2) return;
  
  const deck = shuffle(createDeck());
  const dealCount = Math.min(
    13,
    Math.max(1, Math.floor(deck.length / room.players.length))
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
  
  // 最初のプレイヤーを決定（水を持っているプレイヤー）
  const waterPlayers = room.players.filter((player) =>
    room.game.hands[player.playerId].some((card) => card.rank === 3)
  );
  
  if (waterPlayers.length === 1) {
    room.game.currentTurnPlayerId = waterPlayers[0].playerId;
  } else if (waterPlayers.length > 1) {
    const pick = waterPlayers[Math.floor(Math.random() * waterPlayers.length)];
    room.game.currentTurnPlayerId = pick.playerId;
  } else {
    const randomIndex = Math.floor(Math.random() * room.players.length);
    room.game.currentTurnPlayerId = room.players[randomIndex].playerId;
  }
  
  room.phase = "playing";
  room.stateVersion += 1;
  room.log.push({ at: Date.now(), text: "ゲーム開始" });
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
  if (room.game.ranking.includes(fromId) || room.game.ranking.includes(toId)) {
    return false;
  }
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

function createRoom(name, maxPlayers, turnTimeLimitSec, rules) {
  const ownerId = randomId("p");
  const now = Date.now();
  return {
    roomCode: randomCode(),
    ownerId,
    createdAt: now,
    phase: "lobby",
    maxPlayers: Math.min(Math.max(maxPlayers, 2), 6),
    turnTimeLimitSec: turnTimeLimitSec || null,
    stateVersion: 1,
    players: [
      {
        playerId: ownerId,
        name,
        joinedAt: now,
        disconnected: false,
        lastSeenAt: now,
      },
    ],
    rules,
    game: null,
    log: [{ at: now, text: `${name} がルームを作成` }],
  };
}

function roomSummary(room) {
  const now = Date.now();
  const players = room.players.map((player) => {
    const hand = room.game?.hands[player.playerId] || [];
    return {
      playerId: player.playerId,
      name: player.name,
      disconnected: player.disconnected,
      lastSeenAt: player.lastSeenAt,
      handCount: hand.length,
    };
  });

  return {
    roomCode: room.roomCode,
    ownerId: room.ownerId,
    phase: room.phase,
    maxPlayers: room.maxPlayers,
    turnTimeLimitSec: room.turnTimeLimitSec,
    stateVersion: room.stateVersion,
    rules: room.rules,
    players,
    game: room.game
      ? {
          field: room.game.field,
          revolution: room.game.revolution,
          currentTurnPlayerId: room.game.currentTurnPlayerId,
          turnDeadlineAt: room.game.turnDeadlineAt,
          gameOver: room.game.gameOver,
          ranking: room.game.ranking,
          fieldMeta: room.game.fieldMeta,
        }
      : null,
    log: room.log.slice(-5),
    serverTime: now,
  };
}

module.exports = {
  CARD_SPECS,
  JOKER_CARD,
  JOKER_RANK,
  loadRuleCatalog,
  getDefaultRuleConfig,
  normalizeRuleConfig,
  createDeck,
  shuffle,
  validatePlay,
  buildFieldMeta,
  checkRevolution,
  activePlayerCount,
  nextActivePlayerId,
  pickFirstPlayerId,
  isTequilaCounterPlay,
  isOchokoResetPlay,
  isKanpaiBonusPlay,
  transferRandomCard,
  createRoom,
  roomSummary,
  startGame,
};
