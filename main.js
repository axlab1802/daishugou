const SUITS = ["♠", "♥", "♦", "♣"];
const SEAT_KEYS = ["bottom", "left", "top-left", "top", "top-right", "right"];
const SUIT_NAME_MAP = {
  "♠": "spade",
  "♥": "heart",
  "♦": "diamond",
  "♣": "club",
};
const JOKER_RANK = 16;
const JOKER_CARD = {
  id: "joker",
  rank: JOKER_RANK,
  displayRank: "JOKER",
  name: "ジョーカー",
  emoji: "🃏",
  suit: "joker",
  colors: ["#1f2937", "#111827"],
  artTitle: "孤高のジョーカー",
  artSub: "Joker",
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
    priority: 30,
  },
  {
    id: "water-assault",
    name: "水攻め",
    requires: { 3: 3 },
    beats: (field) =>
      fieldMatchesRankCount(field, 13, [1, 2]) ||
      fieldMatchesRankCount(field, 14, [1, 2]),
    effect: "酔い覚ましじゃ",
    priority: 18,
  },
  {
    id: "kiyoshi-sleep",
    name: "kiyoshiを寝かす",
    requires: { 3: 1, 4: 1 },
    beats: (field) => fieldMatchesRankCount(field, 15, [1]),
    effect: "そろそろ寝てください",
    priority: 22,
  },
  {
    id: "champong",
    name: "ちゃんぽん",
    requires: { 7: 1, 9: 1 },
    beats: (field) =>
      fieldMatchesRankCount(field, 10, [2]) ||
      fieldMatchesRankCount(field, 11, [2]),
    effect: "混ぜると危険",
    priority: 26,
  },
  {
    id: "unlock-rock",
    name: "ロック解除",
    requires: { 12: 1, 3: 1 },
    beats: (field) => fieldMatchesRankCount(field, 12, [2]),
    effect: "水割りの方が飲める",
    priority: 24,
  },
  {
    id: "last-tea",
    name: "〆のお茶",
    requires: { 4: 4 },
    beats: (field) => field.length > 0,
    effect: "はいはい終電終電",
    priority: 10,
  },
  {
    id: "muddy-drunk",
    name: "泥酔コンボ",
    requires: { 11: 2, 12: 1 },
    beats: (field) => fieldMatchesRankCount(field, 15, [2]),
    effect: "限界突破",
    priority: 12,
  },
  {
    id: "care-set",
    name: "介抱セット",
    requires: { 3: 1, 4: 1, 5: 1 },
    beats: (field) => fieldMatchesRankCount(field, 14, [1]),
    effect: "もう飲ませられない",
    priority: 16,
  },
];

const RULES_URL = "./rules.json";
const RULES_STORAGE_KEY = "daishugou_rules_v1";
const NICKNAME_STORAGE_KEY = "daishugou_nickname_v1";
const SFX_URL = "/assets/sfx/sfx.json";
const POLL_INTERVAL_MS = 800;
const POLL_MAX_INTERVAL_MS = 2000;
const RULE_CATALOG_FALLBACK = [
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
  {
    id: "chaserMandatory",
    name: "チェイサー強制",
    description: "強カードの後は水を含めないと出せない",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "mixingPenalty",
    name: "飲み合わせペナルティ",
    description: "革命後はハイボール/炭酸割りの単騎が不可",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "careCounter",
    name: "介抱カウンター",
    description: "介抱セットで勝つと次の手番はコンボ不可",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "muddyDraw",
    name: "泥酔ドロー",
    description: "泥酔コンボ成立時、勝者1枚引き・相手1枚捨て",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "chaserReverse",
    name: "チェイサー逆送",
    description: "レモンサワー単騎後に水2枚で返すと相手に1枚送る",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "shochuLock",
    name: "焼酎ロック",
    description: "焼酎2枚で次の手番の選択を制限",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "spiritusStun",
    name: "スピリタスの気絶",
    description: "2が出た後は次の手番が強制パス",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "jokerSolitude",
    name: "ジョーカー孤高",
    description: "ジョーカーで勝つと場流し＆次の手番は次プレイヤー",
    defaultEnabled: false,
    implemented: false,
  },
  {
    id: "kiyoshiLecture",
    name: "きよしの説教",
    description: "きよし後は同ランクのみで返す",
    defaultEnabled: false,
    implemented: false,
  },
];

const state = {
  mode: "local",
  players: [],
  currentIndex: 0,
  field: [],
  fieldMeta: null,
  passCount: 0,
  lastPlayedIndex: null,
  revolution: false,
  message: "",
  gameOver: false,
  selectedIds: new Set(),
  comboHintCardIds: new Set(),
  comboHintText: "",
  lastAction: null,
  ui: {
    gameActive: false,
  },
  sfx: {
    catalog: null,
    sounds: {},
    enabled: true,
  },
  rules: {
    catalog: [],
    config: {},
    localConfig: {},
  },
  online: {
    roomCode: null,
    playerId: null,
    ownerId: null,
    phase: "lobby",
    pollingId: null,
    pollingDelay: POLL_INTERVAL_MS,
  },
};

function loadNickname() {
  return localStorage.getItem(NICKNAME_STORAGE_KEY) || "";
}

function saveNickname(name) {
  if (!name) return;
  localStorage.setItem(NICKNAME_STORAGE_KEY, name);
}

const elements = {
  playerCount: document.getElementById("player-count"),
  revolutionIndicator: document.getElementById("revolution-indicator"),
  message: document.getElementById("message"),
  field: document.getElementById("field"),
  playerHand: document.getElementById("player-hand"),
  comboHint: document.getElementById("combo-hint"),
  playButton: document.getElementById("play-button"),
  passButton: document.getElementById("pass-button"),
  startButton: document.getElementById("start-button"),
  cpuSelect: document.getElementById("cpu-count"),
  effectLayer: document.getElementById("effect-layer"),
  effectText: document.getElementById("effect-text"),
  seats: Array.from(document.querySelectorAll(".seat")),
  modeLocal: document.getElementById("mode-local"),
  modeOnline: document.getElementById("mode-online"),
  localControls: document.getElementById("local-controls"),
  onlineControls: document.getElementById("online-controls"),
  onlineName: document.getElementById("online-name"),
  onlineRoom: document.getElementById("online-room"),
  onlineMax: document.getElementById("online-max"),
  createRoom: document.getElementById("create-room"),
  joinRoom: document.getElementById("join-room"),
  leaveRoom: document.getElementById("leave-room"),
  onlineStart: document.getElementById("online-start"),
  onlineStatus: document.getElementById("online-status"),
  onlinePlayers: document.getElementById("online-players"),
  ruleSettingsLocal: document.getElementById("rule-settings-local"),
  ruleSettingsOnline: document.getElementById("rule-settings-online"),
};

function setGameActive(active) {
  state.ui.gameActive = active;
  document.body.classList.toggle("is-game-active", active);
}

function playSfx(id) {
  if (!state.sfx.enabled) return;
  const sound = state.sfx.sounds[id];
  if (!sound) return;
  sound.play();
}

async function loadSfxCatalog() {
  try {
    const res = await fetch(SFX_URL, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    // ignore
  }
  return null;
}

function initSfx(catalog) {
  if (!catalog || !catalog.sounds || !window.Howl) {
    state.sfx.enabled = false;
    return;
  }
  state.sfx.catalog = catalog;
  const masterVolume = Number(catalog.masterVolume ?? 1);
  if (window.Howler) {
    Howler.volume(Math.max(0, Math.min(1, masterVolume)));
  }
  Object.entries(catalog.sounds).forEach(([id, def]) => {
    const volume = Number(def.volume ?? 1);
    state.sfx.sounds[id] = new Howl({
      src: def.files,
      volume: Math.max(0, Math.min(1, volume)),
    });
  });
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

function sortHandCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return a.id.localeCompare(b.id);
  });
}

function cardAssetKey(rank) {
  if (rank === JOKER_RANK) return "joker";
  if (rank === 14) return "A";
  if (rank === 15) return "2";
  return String(rank);
}

function cardImagePath(card) {
  if (card.rank === JOKER_RANK) return "/assets/joker.png";
  const suitName = SUIT_NAME_MAP[card.suit] || "spade";
  const rankKey = cardAssetKey(card.rank);
  return `/assets/generated/card_${rankKey}_${suitName}.svg`;
}

function strengthValue(rank) {
  if (rank === JOKER_RANK) return 999;
  return state.revolution ? 16 - rank : rank;
}

function isStronger(rankA, rankB) {
  return strengthValue(rankA) > strengthValue(rankB);
}

function fieldMatchesRankCount(field, rank, counts) {
  if (field.length === 0) return false;
  const sameRank = field.every((card) => card.rank === rank);
  if (!sameRank) return false;
  return counts.includes(field.length);
}

const RULE_COMBOS = {
  tequilaCounter: {
    id: "tequila-counter",
    name: "テキーラ返し",
    requires: { 3: 2 },
    beats: (field) => fieldMatchesRankCount(field, 13, [1]),
    effect: "ランダム1枚送付",
    priority: 14,
    ruleId: "tequilaCounter",
  },
};

function isRuleEnabled(id) {
  return Boolean(state.rules?.config?.[id]);
}

function getActiveCombos() {
  const combos = [...COMBOS];
  if (isRuleEnabled("tequilaCounter")) {
    combos.push(RULE_COMBOS.tequilaCounter);
  }
  return combos;
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

function readStoredRules() {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function saveStoredRules(config) {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    // ignore
  }
}

async function loadRuleCatalog() {
  try {
    const res = await fetch(RULES_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.rules)) {
        return data.rules;
      }
    }
  } catch (error) {
    // ignore
  }
  return RULE_CATALOG_FALLBACK;
}

function setRuleEnabled(id, enabled) {
  const next = { ...state.rules.localConfig, [id]: Boolean(enabled) };
  state.rules.localConfig = next;
  state.rules.config = { ...next };
  saveStoredRules(next);
  renderRuleSettings();
  updateRuleSettingsAvailability();
  updateComboHints();
}

function renderRuleSettings() {
  const containers = [elements.ruleSettingsLocal, elements.ruleSettingsOnline].filter(
    Boolean
  );
  containers.forEach((container) => {
    container.innerHTML = "";
    state.rules.catalog.forEach((rule) => {
      const option = document.createElement("label");
      option.className = "rule-option";
      if (!rule.implemented) {
        option.classList.add("is-disabled");
      }

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(state.rules.config[rule.id]);
      checkbox.dataset.ruleId = rule.id;
      checkbox.disabled = !rule.implemented;
      checkbox.addEventListener("change", (event) => {
        setRuleEnabled(rule.id, event.target.checked);
      });

      const text = document.createElement("div");
      text.className = "rule-option__text";

      const name = document.createElement("div");
      name.className = "rule-option__name";
      name.textContent = rule.name;

      const desc = document.createElement("div");
      desc.className = "rule-option__desc";
      desc.textContent = rule.description;

      const status = document.createElement("div");
      status.className = "rule-option__status";
      status.textContent = rule.implemented
        ? state.rules.config[rule.id]
          ? "ON"
          : "OFF"
        : "未実装";

      text.appendChild(name);
      text.appendChild(desc);
      text.appendChild(status);
      option.appendChild(checkbox);
      option.appendChild(text);
      container.appendChild(option);
    });
  });
}

function updateRuleSettingsAvailability() {
  const editable =
    state.mode === "local" || (state.mode === "online" && !state.online.roomCode);
  const inputs = document.querySelectorAll(".rule-option input[data-rule-id]");
  inputs.forEach((input) => {
    const rule = state.rules.catalog.find((item) => item.id === input.dataset.ruleId);
    const isImplemented = rule ? rule.implemented : false;
    input.disabled = !editable || !isImplemented;
  });
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
        artTitle: "中世風の油絵",
        artSub: spec.name,
      });
    });
  });
  deck.push({ ...JOKER_CARD });
  return deck;
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function ensurePlayerHasBeer(playerHand, pool) {
  const hasBeer = playerHand.some((card) => card.name === "ビール");
  if (hasBeer) return;
  const beerIndex = pool.findIndex((card) => card.name === "ビール");
  if (beerIndex === -1) return;
  const swapIndex = Math.floor(Math.random() * playerHand.length);
  const [beerCard] = pool.splice(beerIndex, 1);
  pool.push(playerHand[swapIndex]);
  playerHand[swapIndex] = beerCard;
}

function setupPlayers(cpuCount) {
  const totalPlayers = cpuCount + 1;
  state.players = Array.from({ length: totalPlayers }, (_, index) => ({
    id: index,
    name: index === 0 ? "あなた" : `CPU ${index}`,
    isHuman: index === 0,
    hand: [],
    finished: false,
  }));
}

function dealHands(cpuCount) {
  setupPlayers(cpuCount);
  const deck = shuffle(createDeck());
  state.players.forEach((player) => {
    player.hand = deck.splice(0, 10);
    player.finished = false;
  });
  ensurePlayerHasBeer(state.players[0].hand, deck);
  state.field = [];
  state.fieldMeta = null;
  state.passCount = 0;
  state.lastPlayedIndex = null;
  state.revolution = false;
  state.gameOver = false;
  state.selectedIds = new Set();
  state.comboHintCardIds = new Set();
  state.comboHintText = "";
  state.lastAction = "deal";
}

function determineFirstTurn() {
  const waterPlayers = state.players
    .map((player, index) => ({
      index,
      hasWater: player.hand.some((card) => card.rank === 3),
    }))
    .filter((player) => player.hasWater);

  if (waterPlayers.length === 1) {
    state.currentIndex = waterPlayers[0].index;
  } else if (waterPlayers.length > 1) {
    const pick = waterPlayers[Math.floor(Math.random() * waterPlayers.length)];
    state.currentIndex = pick.index;
  } else {
    state.currentIndex = Math.floor(Math.random() * state.players.length);
  }

  setMessage(`${playerName(state.currentIndex)}のターンです`);
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

function getComboMatch(cards) {
  const counts = countRanks(cards);
  return (
    getActiveCombos().find((combo) => {
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

function getCardsForCombo(hand, combo) {
  const cards = [];
  const handByRank = countRanks(hand);
  const requiredRanks = Object.keys(combo.requires).map((rank) => Number(rank));
  if (
    !requiredRanks.every((rank) => (handByRank[rank] || 0) >= combo.requires[rank])
  ) {
    return null;
  }
  const remaining = [...hand];
  requiredRanks.forEach((rank) => {
    let needed = combo.requires[rank];
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      if (remaining[i].rank === rank && needed > 0) {
        cards.push(remaining[i]);
        remaining.splice(i, 1);
        needed -= 1;
      }
    }
  });
  return cards.length === requiredRanks.reduce((sum, rank) => sum + combo.requires[rank], 0)
    ? cards
    : null;
}

function getPlayableCombos(hand, field) {
  if (field.length === 0) return [];
  return getActiveCombos().map((combo) => {
    const cards = getCardsForCombo(hand, combo);
    if (!cards) return null;
    if (!combo.beats(field)) return null;
    return { combo, cards };
  }).filter(Boolean);
}

function getNormalPlayOptions(hand, fieldMeta) {
  if (!fieldMeta) return [];
  const options = [];
  const grouped = countRanks(hand);
  Object.keys(grouped).forEach((rankKey) => {
    const rank = Number(rankKey);
    if (grouped[rank] < fieldMeta.count) return;
    if (!isStronger(rank, fieldMeta.comboStrength)) return;
    const cards = hand.filter((card) => card.rank === rank).slice(0, fieldMeta.count);
    options.push({ rank, cards, strength: strengthValue(rank) });
  });
  return options.sort((a, b) => a.strength - b.strength);
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

function isTequilaCounterPlay(cards, field) {
  if (!isRuleEnabled("tequilaCounter")) return false;
  if (!fieldMatchesRankCount(field, 13, [1])) return false;
  if (cards.length !== 2) return false;
  return cards.every((card) => card.rank === 3);
}

function isOchokoResetPlay(cards) {
  if (!isRuleEnabled("ochokoReset")) return false;
  if (cards.length !== 3) return false;
  return cards.every((card) => card.rank === 10);
}

function isKanpaiBonusPlay(cards, field) {
  if (!isRuleEnabled("kanpaiBonus")) return false;
  if (!fieldMatchesRankCount(field, 7, [1])) return false;
  if (cards.length !== 1) return false;
  return cards[0].rank === 9;
}

function transferRandomCard(fromIndex, toIndex) {
  const from = state.players[fromIndex];
  const to = state.players[toIndex];
  if (!from || !to) return false;
  if (from.finished || to.finished) return false;
  if (!from.hand.length) return false;
  const pickIndex = Math.floor(Math.random() * from.hand.length);
  const [card] = from.hand.splice(pickIndex, 1);
  to.hand.push(card);
  return true;
}

function validatePlay(cards) {
  if (cards.length === 0) {
    return { ok: false, reason: "カードを選択してください" };
  }
  if (state.field.length === 0) {
    if (!isAllSameRank(cards)) {
      return { ok: false, reason: "場が空の時は同じランクのみ出せます" };
    }
    return { ok: true, combo: null };
  }

  const combo = getComboMatch(cards);
  if (combo && combo.beats(state.field)) {
    return { ok: true, combo };
  }

  if (!isAllSameRank(cards)) {
    return { ok: false, reason: "同じランクのカードを選んでください" };
  }

  if (cards.length !== state.fieldMeta.count) {
    return { ok: false, reason: "場と同じ枚数で出してください" };
  }

  if (!isStronger(cards[0].rank, state.fieldMeta.comboStrength)) {
    return { ok: false, reason: "場より強いカードが必要です" };
  }

  return { ok: true, combo: null };
}

function removeCardsFromHand(hand, cardsToRemove) {
  const idsToRemove = new Set(cardsToRemove.map((card) => card.id));
  return hand.filter((card) => !idsToRemove.has(card.id));
}

function checkRevolution(cards) {
  if (cards.length !== 4) return false;
  return isAllSameRank(cards);
}

function activePlayerIndices() {
  return state.players
    .map((player, index) => (player.finished ? null : index))
    .filter((index) => index !== null);
}

function activeCount() {
  return activePlayerIndices().length;
}

function nextActiveIndex(fromIndex) {
  const total = state.players.length;
  let index = fromIndex;
  for (let i = 0; i < total; i += 1) {
    index = (index + 1) % total;
    if (!state.players[index].finished) {
      return index;
    }
  }
  return fromIndex;
}

function playerName(index) {
  return state.players[index]?.name || "";
}

function setMessage(text) {
  state.message = text;
  elements.message.textContent = text;
  animateMessage();
}

function animateMessage() {
  if (!window.gsap) return;
  gsap.fromTo(
    elements.message,
    { opacity: 0.4, y: -6 },
    { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
  );
}

function showEffect(text) {
  if (!window.gsap) return;
  elements.effectText.textContent = text;
  gsap.killTweensOf([elements.effectLayer, elements.effectText]);
  gsap.set(elements.effectLayer, { opacity: 1 });
  const tl = gsap.timeline();
  tl.fromTo(
    elements.effectText,
    { scale: 0.6, opacity: 0, y: 30 },
    { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }
  )
    .to(elements.effectText, { scale: 1.1, duration: 0.25, ease: "power1.inOut" })
    .to(elements.effectLayer, { opacity: 0, duration: 0.6, delay: 0.5 });
}

function renderSeats() {
  const totalPlayers = state.players.length;
  const seatMap = new Map();
  state.players.forEach((player, index) => {
    const seatKey = index === 0 ? "bottom" : SEAT_KEYS[index];
    seatMap.set(seatKey, { player, index });
  });

  elements.seats.forEach((seat) => {
    const seatKey = seat.dataset.seat;
    const slot = seatMap.get(seatKey);
    if (!slot) {
      seat.classList.add("is-hidden");
      return;
    }
    seat.classList.remove("is-hidden");
    const nameEl = seat.querySelector(".seat__name");
    const countEl = seat.querySelector(".seat__count");
    const handEl = seat.querySelector(".seat__hand");
    const { player, index } = slot;

    const handCount = Number.isFinite(player.handCount)
      ? player.handCount
      : player.hand.length;

    nameEl.textContent = player.name;
    countEl.textContent = player.finished ? "上がり" : `残り ${handCount} 枚`;
    handEl.innerHTML = "";
    if (!player.isHuman) {
      const showCount = Math.min(handCount, 8);
      for (let i = 0; i < showCount; i += 1) {
        handEl.appendChild(createCardBack());
      }
    }

    if (index === state.currentIndex && !state.gameOver) {
      seat.classList.add("is-active");
    } else {
      seat.classList.remove("is-active");
    }
  });

  elements.playerCount.textContent = String(totalPlayers || 0);
}

function renderField() {
  elements.field.innerHTML = "";
  if (state.field.length === 0) {
    const empty = document.createElement("div");
    empty.className = "field-empty";
    empty.textContent = "まだカードが出されていません";
    empty.style.color = "rgba(255, 255, 255, 0.7)";
    elements.field.appendChild(empty);
    return;
  }

  state.field.forEach((card) => {
    const cardEl = createCardElement(card);
    cardEl.classList.add("is-selected");
    elements.field.appendChild(cardEl);
  });

  if (window.gsap && state.lastAction === "play") {
    gsap.fromTo(
      elements.field.children,
      { opacity: 0, y: 20, rotation: -6, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
      }
    );
  }
}

function renderPlayerHand() {
  const player = state.players[0];
  elements.playerHand.innerHTML = "";
  if (!player || player.finished) return;

  sortHandCards(player.hand).forEach((card) => {
    const cardEl = createCardElement(card);
    if (state.selectedIds.has(card.id)) {
      cardEl.classList.add("is-selected");
    }
    if (state.comboHintCardIds.has(card.id)) {
      cardEl.classList.add("is-combo-hint");
    }
    cardEl.addEventListener("click", () => toggleSelection(card.id));
    elements.playerHand.appendChild(cardEl);
  });

  if (window.gsap && state.lastAction === "deal") {
    gsap.fromTo(
      elements.playerHand.children,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
    );
  }
}

function renderInfo() {
  elements.revolutionIndicator.textContent = state.revolution ? "🔥革命中" : "通常進行";
}

function renderComboHint() {
  if (!state.comboHintText) {
    elements.comboHint.classList.remove("is-active");
    elements.comboHint.textContent = "";
    return;
  }
  elements.comboHint.textContent = state.comboHintText;
  elements.comboHint.classList.add("is-active");
  if (window.gsap) {
    gsap.fromTo(
      elements.comboHint,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
  }
}

function updateButtons() {
  const isOnline = state.mode === "online";
  const onlinePlayable =
    !state.gameOver &&
    state.online.phase === "playing" &&
    state.currentIndex === 0 &&
    state.players[0]?.hand?.length > 0;
  const disabled = isOnline ? !onlinePlayable : state.gameOver || state.currentIndex !== 0;
  elements.playButton.disabled = disabled;
  elements.passButton.disabled = disabled;
}

function renderAll() {
  renderSeats();
  renderField();
  renderPlayerHand();
  renderInfo();
  renderComboHint();
  updateButtons();
}

function toggleSelection(cardId) {
  if (state.gameOver || state.currentIndex !== 0) return;
  const player = state.players[0];
  if (!player || !player.hand.some((card) => card.id === cardId)) return;
  if (state.selectedIds.has(cardId)) {
    state.selectedIds.delete(cardId);
    playSfx("ui_deselect");
  } else {
    state.selectedIds.add(cardId);
    playSfx("ui_select");
  }
  updateComboHints();
  renderPlayerHand();
}

function applyPlay(playerIndex, cards, combo) {
  state.lastAction = "play";
  const previousField = state.field;
  const previousPlayerIndex = state.lastPlayedIndex;
  const player = state.players[playerIndex];
  player.hand = removeCardsFromHand(player.hand, cards);
  if (playerIndex === 0) {
    state.selectedIds = new Set();
  }
  state.field = cards;
  state.fieldMeta = buildFieldMeta(cards, combo);
  state.lastPlayedIndex = playerIndex;
  state.passCount = 0;
  playSfx("play");

  if (combo) {
    playSfx("combo");
    showEffect(`${combo.name}！`);
    setTimeout(() => showEffect(combo.effect), 400);
  }

  if (checkRevolution(cards)) {
    state.revolution = !state.revolution;
    playSfx("revolution");
    showEffect(state.revolution ? "🔥革命！" : "革命返し！");
  }

  const tequilaCounterTriggered = isTequilaCounterPlay(cards, previousField);
  if (tequilaCounterTriggered && previousPlayerIndex !== null) {
    transferRandomCard(playerIndex, previousPlayerIndex);
  }

  const ochokoResetTriggered = isOchokoResetPlay(cards);
  const kanpaiBonusTriggered = isKanpaiBonusPlay(cards, previousField);
  if (ochokoResetTriggered) {
    showEffect("おちょこリセット！");
    playSfx("field_clear");
  } else if (kanpaiBonusTriggered) {
    showEffect("乾杯ボーナス！");
    playSfx("field_clear");
  }

  if (player.hand.length === 0 && !player.finished) {
    player.finished = true;
    showEffect(`${player.name} 上がり！`);
    if (player.isHuman) {
      state.gameOver = true;
      setGameActive(false);
      playSfx("win");
      setMessage("あなたの勝ち！（大酒豪）");
      renderAll();
      return;
    }
  }

  if (activeCount() <= 1) {
    state.gameOver = true;
    setGameActive(false);
    const humanFinished = state.players[0]?.finished;
    playSfx(humanFinished ? "win" : "lose");
    setMessage(humanFinished ? "あなたの勝ち！（大酒豪）" : "あなたの負け…（酔い潰れ）");
    renderAll();
    return;
  }

  if (!player.finished && !state.gameOver && (ochokoResetTriggered || kanpaiBonusTriggered)) {
    state.field = [];
    state.fieldMeta = null;
    state.passCount = 0;
    state.currentIndex = playerIndex;
    setMessage(`${playerName(state.currentIndex)}のターンです`);
    updateComboHints();
    renderAll();
    runCpuTurns();
    return;
  }

  state.currentIndex = nextActiveIndex(playerIndex);
  setMessage(`${playerName(state.currentIndex)}のターンです`);
  updateComboHints();
  renderAll();
  runCpuTurns();
}

function handlePass(playerIndex) {
  if (state.field.length === 0) {
    if (playerIndex === 0) {
      setMessage("場が空の時はパスできません");
    }
    return;
  }

  if (playerIndex === 0) {
    state.selectedIds = new Set();
  }
  playSfx("pass");
  state.passCount += 1;
  const active = activeCount();
  if (state.passCount >= active - 1) {
    state.field = [];
    state.fieldMeta = null;
    state.passCount = 0;
    playSfx("field_clear");
    showEffect("場流し！");
    const nextIndex =
      state.lastPlayedIndex !== null && !state.players[state.lastPlayedIndex].finished
        ? state.lastPlayedIndex
        : nextActiveIndex(playerIndex);
    state.currentIndex = nextIndex;
    setMessage(`${playerName(state.currentIndex)}のターンです`);
    updateComboHints();
    renderAll();
    runCpuTurns();
    return;
  }

  state.currentIndex = nextActiveIndex(playerIndex);
  setMessage(`${playerName(state.currentIndex)}のターンです`);
  updateComboHints();
  renderAll();
  runCpuTurns();
}

function playSelected() {
  if (state.mode === "online") {
    sendOnlineAction("play");
    return;
  }

  if (state.gameOver || state.currentIndex !== 0) return;
  const player = state.players[0];
  const selected = player.hand.filter((card) => state.selectedIds.has(card.id));
  const validation = validatePlay(selected);
  if (!validation.ok) {
    setMessage(validation.reason);
    if (window.gsap) {
      gsap.fromTo(
        elements.message,
        { x: -6 },
        { x: 6, duration: 0.08, repeat: 3, yoyo: true, ease: "power1.inOut" }
      );
    }
    return;
  }

  applyPlay(0, selected, validation.combo);
}

function passTurn() {
  if (state.mode === "online") {
    sendOnlineAction("pass");
    return;
  }

  if (state.gameOver || state.currentIndex !== 0) return;
  handlePass(0);
}

function decideCPUPlay(playerIndex) {
  const player = state.players[playerIndex];
  if (state.field.length === 0) {
    const sorted = [...player.hand].sort(
      (a, b) => strengthValue(a.rank) - strengthValue(b.rank)
    );
    return { type: "play", cards: [sorted[0]], combo: null };
  }

  const comboPlays = getPlayableCombos(player.hand, state.field).sort(
    (a, b) => a.combo.priority - b.combo.priority
  );
  if (comboPlays.length > 0) {
    return { type: "play", cards: comboPlays[0].cards, combo: comboPlays[0].combo };
  }

  const normalOptions = getNormalPlayOptions(player.hand, state.fieldMeta);
  if (normalOptions.length > 0) {
    return { type: "play", cards: normalOptions[0].cards, combo: null };
  }

  return { type: "pass" };
}

function runCpuTurns() {
  if (state.mode !== "local") return;
  if (state.gameOver || state.currentIndex === 0) return;
  updateButtons();

  const cpuIndex = state.currentIndex;
  setTimeout(() => {
    if (state.mode !== "local" || state.gameOver || state.currentIndex !== cpuIndex) return;
    const decision = decideCPUPlay(cpuIndex);
    if (decision.type === "pass") {
      handlePass(cpuIndex);
      return;
    }
    applyPlay(cpuIndex, decision.cards, decision.combo);
  }, 800);
}

function updateComboHints() {
  const player = state.players[0];
  if (!player || player.finished || state.currentIndex !== 0) {
    state.comboHintCardIds = new Set();
    state.comboHintText = "";
    return;
  }
  const playableCombos = getPlayableCombos(player.hand, state.field);
  const hintIds = new Set();
  if (playableCombos.length === 0) {
    state.comboHintCardIds = hintIds;
    state.comboHintText = "";
    return;
  }

  playableCombos.forEach(({ combo }) => {
    const cards = getCardsForCombo(player.hand, combo);
    if (cards) {
      cards.forEach((card) => hintIds.add(card.id));
    }
  });

  const mainCombo = playableCombos[0].combo;
  const extraCount = playableCombos.length - 1;
  const extraText = extraCount > 0 ? `（他${extraCount}個のコンボも可能）` : "";
  state.comboHintCardIds = hintIds;
  state.comboHintText = `${mainCombo.name}：${mainCombo.effect}${extraText}`;
}

function createCardElement(card) {
  const cardEl = document.createElement("div");
  cardEl.className = "card card--image";
  cardEl.dataset.id = card.id;

  const img = document.createElement("img");
  img.src = cardImagePath(card);
  img.alt = `${card.name}`;
  img.loading = "lazy";
  cardEl.appendChild(img);
  return cardEl;
}

function createCardBack() {
  const cardBack = document.createElement("div");
  cardBack.className = "card-back";
  return cardBack;
}

function startLocalGame() {
  state.mode = "local";
  state.online.phase = "lobby";
  const cpuCount = Number(elements.cpuSelect.value);
  dealHands(cpuCount);
  determineFirstTurn();
  updateComboHints();
  setGameActive(true);
  playSfx("start");
  renderAll();
  if (state.currentIndex !== 0) {
    runCpuTurns();
  }
}

function setMode(mode) {
  state.mode = mode;
  elements.modeLocal.classList.toggle("is-active", mode === "local");
  elements.modeOnline.classList.toggle("is-active", mode === "online");
  elements.localControls.classList.toggle("is-hidden", mode !== "local");
  elements.onlineControls.classList.toggle("is-hidden", mode !== "online");
  state.rules.config = { ...state.rules.localConfig };
  renderRuleSettings();
  updateRuleSettingsAvailability();
  setGameActive(false);

  if (mode === "local") {
    stopPolling();
    startLocalGame();
    return;
  }

  resetOnlineState();
  renderAll();
}

function resetOnlineState() {
  state.players = [];
  state.currentIndex = 0;
  state.field = [];
  state.fieldMeta = null;
  state.passCount = 0;
  state.lastPlayedIndex = null;
  state.revolution = false;
  state.gameOver = false;
  state.selectedIds = new Set();
  state.comboHintCardIds = new Set();
  state.comboHintText = "";
  state.lastAction = null;
  state.rules.config = { ...state.rules.localConfig };
  setMessage("ロビー待機中");
  elements.onlineStart.disabled = true;
  renderRuleSettings();
  updateRuleSettingsAvailability();
  setGameActive(false);
}

function setOnlineStatus(text) {
  elements.onlineStatus.textContent = text;
}

function updateLobbyPlayers(room) {
  if (!room) {
    elements.onlinePlayers.innerHTML = "";
    return;
  }
  elements.onlinePlayers.innerHTML = room.players
    .map((player) => {
      const badge = player.playerId === room.ownerId ? "（オーナー）" : "";
      return `<div>${player.name} ${badge}</div>`;
    })
    .join("");
}

async function apiRequest(path, method, body) {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (res.ok && data.ok !== false) {
      return data;
    }
    const message = data.reason || data.error || "API_ERROR";
    if (message === "ROOM_BUSY" && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      continue;
    }
    throw new Error(message);
  }
  throw new Error("API_ERROR");
}

async function createRoom() {
  const name = elements.onlineName.value.trim() || "Player";
  const maxPlayers = Number(elements.onlineMax.value);
  try {
    saveNickname(name);
    setOnlineStatus("ルーム作成中...");
    const data = await apiRequest("/api/rooms", "POST", {
      ownerName: name,
      maxPlayers,
      rules: state.rules.config,
    });
    state.online.roomCode = data.roomCode;
    state.online.playerId = data.playerId;
    state.online.ownerId = data.ownerId;
    elements.onlineRoom.value = data.roomCode;
    setOnlineStatus(`ルーム作成: ${data.roomCode}`);
    updateRuleSettingsAvailability();
    startPolling();
  } catch (error) {
    setOnlineStatus(`エラー: ${error.message}`);
  }
}

async function joinRoom() {
  const name = elements.onlineName.value.trim() || "Player";
  const roomCode = elements.onlineRoom.value.trim();
  if (!roomCode) {
    setOnlineStatus("ルームコードを入力してください");
    return;
  }
  try {
    saveNickname(name);
    setOnlineStatus("参加中...");
    const data = await apiRequest(`/api/rooms/${roomCode}/join`, "POST", { name });
    state.online.roomCode = roomCode;
    state.online.playerId = data.playerId;
    setOnlineStatus(`参加完了: ${roomCode}`);
    updateRuleSettingsAvailability();
    startPolling();
  } catch (error) {
    setOnlineStatus(`エラー: ${error.message}`);
  }
}

async function leaveRoom() {
  if (!state.online.roomCode || !state.online.playerId) return;
  try {
    await apiRequest(`/api/rooms/${state.online.roomCode}/leave`, "POST", {
      playerId: state.online.playerId,
    });
  } catch (error) {
    // ignore
  }
  stopPolling();
  state.online.roomCode = null;
  state.online.playerId = null;
  state.online.ownerId = null;
  resetOnlineState();
  renderAll();
  setOnlineStatus("退出しました");
}

async function startOnlineGame() {
  if (!state.online.roomCode || !state.online.playerId) return;
  try {
    await apiRequest(`/api/rooms/${state.online.roomCode}/start`, "POST", {
      ownerId: state.online.ownerId,
    });
  } catch (error) {
    setOnlineStatus(`エラー: ${error.message}`);
  }
}

function reorderPlayers(players, localId) {
  const index = players.findIndex((player) => player.playerId === localId);
  if (index <= 0) return players;
  return [...players.slice(index), ...players.slice(0, index)];
}

function applyOnlineState(data) {
  const room = data.room;
  if (!room) return;

  state.online.phase = room.phase;
  state.online.ownerId = room.ownerId;
  setOnlineStatus(`ルーム ${room.roomCode} / ${room.phase}`);
  updateLobbyPlayers(room);
  if (room.rules) {
    state.rules.config = normalizeRuleConfig(state.rules.catalog, room.rules);
    renderRuleSettings();
    updateRuleSettingsAvailability();
  }

  if (room.phase === "lobby") {
    setGameActive(false);
    state.players = reorderPlayers(room.players, state.online.playerId).map((player) => ({
      id: player.playerId,
      name: player.name,
      isHuman: player.playerId === state.online.playerId,
      hand: player.playerId === state.online.playerId ? data.yourHand || [] : [],
      handCount: player.handCount,
      finished: false,
    }));
    state.field = [];
    state.revolution = false;
    state.gameOver = false;
    state.currentIndex = 0;
    setMessage("ロビー待機中");
    renderAll();
    elements.onlineStart.disabled = room.ownerId !== state.online.playerId;
    return;
  }

  const orderedPlayers = reorderPlayers(room.players, state.online.playerId).map((player) => ({
    id: player.playerId,
    name: player.name,
    isHuman: player.playerId === state.online.playerId,
    hand: player.playerId === state.online.playerId ? data.yourHand || [] : [],
    handCount: player.handCount,
    finished: room.game?.ranking?.includes(player.playerId) || false,
  }));

  const handIds = new Set((data.yourHand || []).map((card) => card.id));
  state.selectedIds = new Set(
    [...state.selectedIds].filter((id) => handIds.has(id))
  );

  state.players = orderedPlayers;
  state.field = room.game?.field || [];
  state.revolution = room.game?.revolution || false;
  state.gameOver = room.game?.gameOver || false;
  state.currentIndex = orderedPlayers.findIndex(
    (player) => player.id === room.game?.currentTurnPlayerId
  );
  state.fieldMeta = room.game?.fieldMeta || null;

  if (state.gameOver) {
    setGameActive(false);
    setMessage("ゲーム終了");
  } else if (state.currentIndex === 0) {
    setGameActive(true);
    setMessage("あなたのターンです");
  } else if (state.currentIndex >= 0) {
    setGameActive(true);
    setMessage(`${playerName(state.currentIndex)}のターンです`);
  }

  updateComboHints();
  renderAll();
  elements.onlineStart.disabled = true;
}

async function fetchOnlineState() {
  if (!state.online.roomCode || !state.online.playerId) return;
  try {
    const data = await apiRequest(
      `/api/rooms/${state.online.roomCode}/state?playerId=${state.online.playerId}`,
      "GET"
    );
    applyOnlineState(data);
    return true;
  } catch (error) {
    setOnlineStatus(`エラー: ${error.message}`);
    return false;
  }
}

function startPolling() {
  stopPolling();
  state.online.pollingDelay = POLL_INTERVAL_MS;
  const tick = async () => {
    const ok = await fetchOnlineState();
    if (!state.online.pollingId) return;
    if (!ok) {
      state.online.pollingDelay = Math.min(
        POLL_MAX_INTERVAL_MS,
        state.online.pollingDelay + 400
      );
    } else {
      state.online.pollingDelay = POLL_INTERVAL_MS;
    }
    state.online.pollingId = setTimeout(tick, state.online.pollingDelay);
  };
  state.online.pollingId = setTimeout(tick, 0);
}

function stopPolling() {
  if (state.online.pollingId) {
    clearTimeout(state.online.pollingId);
    state.online.pollingId = null;
  }
}

function sendOnlineAction(type) {
  if (state.mode !== "online") return;
  if (state.online.phase !== "playing") return;
  if (state.currentIndex !== 0) return;
  if (!state.online.roomCode || !state.online.playerId) return;

  const player = state.players[0];
  const cardIds =
    type === "play"
      ? player.hand.filter((card) => state.selectedIds.has(card.id)).map((card) => card.id)
      : [];
  if (type === "play" && cardIds.length === 0) {
    setMessage("カードを選択してください");
    return;
  }

  apiRequest(`/api/rooms/${state.online.roomCode}/action`, "POST", {
    playerId: state.online.playerId,
    type,
    cardIds,
  })
    .then(() => {
      if (type === "play") {
        state.selectedIds = new Set();
      }
      fetchOnlineState();
    })
    .catch((error) => {
      setOnlineStatus(`エラー: ${error.message}`);
    });
}

async function init() {
  const catalog = await loadRuleCatalog();
  state.rules.catalog = catalog;
  const defaults = getDefaultRuleConfig(catalog);
  const stored = readStoredRules();
  const merged = { ...defaults, ...(stored || {}) };
  const normalized = normalizeRuleConfig(catalog, merged);
  state.rules.localConfig = normalized;
  state.rules.config = { ...normalized };
  renderRuleSettings();
  updateRuleSettingsAvailability();
  const sfxCatalog = await loadSfxCatalog();
  initSfx(sfxCatalog);

  elements.playButton.addEventListener("click", playSelected);
  elements.passButton.addEventListener("click", passTurn);
  elements.startButton.addEventListener("click", startLocalGame);
  elements.modeLocal.addEventListener("click", () => setMode("local"));
  elements.modeOnline.addEventListener("click", () => setMode("online"));
  elements.createRoom.addEventListener("click", createRoom);
  elements.joinRoom.addEventListener("click", joinRoom);
  elements.leaveRoom.addEventListener("click", leaveRoom);
  elements.onlineStart.addEventListener("click", startOnlineGame);

  const storedName = loadNickname();
  if (storedName && elements.onlineName) {
    elements.onlineName.value = storedName;
  }

  setMode("local");
}

init();
