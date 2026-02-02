const { createClient } = require("redis");

const ROOM_TTL_SEC = 6 * 60 * 60;
const ROOM_PREFIX = "room:";
const LOCK_PREFIX = "room-lock:";

let clientPromise = null;

function roomKey(roomCode) {
  return `${ROOM_PREFIX}${roomCode}`;
}

async function getClient() {
  if (!clientPromise) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is not set");
    }
    const client = createClient({ url });
    client.on("error", () => {});
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}

async function getRoom(roomCode) {
  const client = await getClient();
  const raw = await client.get(roomKey(roomCode));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function saveRoom(room) {
  const client = await getClient();
  return client.set(roomKey(room.roomCode), JSON.stringify(room), {
    EX: ROOM_TTL_SEC,
  });
}

async function deleteRoom(roomCode) {
  const client = await getClient();
  return client.del(roomKey(roomCode));
}

async function touchRoom(roomCode) {
  const client = await getClient();
  return client.expire(roomKey(roomCode), ROOM_TTL_SEC);
}

async function withRoomLock(roomCode, handler) {
  const client = await getClient();
  const lockKey = `${LOCK_PREFIX}${roomCode}`;
  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const acquired = await client.set(lockKey, lockToken, { NX: true, EX: 3 });
  if (!acquired) {
    return { ok: false, error: "ROOM_BUSY" };
  }
  try {
    return await handler();
  } finally {
    await client.del(lockKey);
  }
}

module.exports = {
  ROOM_TTL_SEC,
  getRoom,
  saveRoom,
  deleteRoom,
  touchRoom,
  withRoomLock,
};
