const { kv } = require("@vercel/kv");

const ROOM_TTL_SEC = 6 * 60 * 60;
const ROOM_PREFIX = "room:";
const LOCK_PREFIX = "room-lock:";

function roomKey(roomCode) {
  return `${ROOM_PREFIX}${roomCode}`;
}

async function getRoom(roomCode) {
  return kv.get(roomKey(roomCode));
}

async function saveRoom(room) {
  return kv.set(roomKey(room.roomCode), room, { ex: ROOM_TTL_SEC });
}

async function deleteRoom(roomCode) {
  return kv.del(roomKey(roomCode));
}

async function touchRoom(roomCode) {
  return kv.expire(roomKey(roomCode), ROOM_TTL_SEC);
}

async function withRoomLock(roomCode, handler) {
  const lockKey = `${LOCK_PREFIX}${roomCode}`;
  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const acquired = await kv.set(lockKey, lockToken, { nx: true, ex: 3 });
  if (!acquired) {
    return { ok: false, error: "ROOM_BUSY" };
  }
  try {
    return await handler();
  } finally {
    await kv.del(lockKey);
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
