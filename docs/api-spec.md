# API仕様

## 共通
- Base Path: `/api`
- Content-Type: `application/json`
- レスポンス形式: `{ ok: boolean, ... }`

## 1. ルーム作成
`POST /api/rooms`

### Request
```json
{
  "ownerName": "string",
  "maxPlayers": 2,
  "turnTimeLimitSec": null,
  "rules": {
    "tequilaCounter": true,
    "ochokoReset": true,
    "kanpaiBonus": true
  }
}
```

### Response
```json
{
  "ok": true,
  "roomCode": "123456",
  "ownerId": "p_xxx",
  "playerId": "p_xxx",
  "rules": { "tequilaCounter": true }
}
```

## 2. ルーム参加
`POST /api/rooms/{room}/join`

### Request
```json
{ "name": "string" }
```

### Response
```json
{ "ok": true, "playerId": "p_xxx" }
```

## 3. ルーム退出
`POST /api/rooms/{room}/leave`

### Request
```json
{ "playerId": "p_xxx" }
```

### Response
```json
{ "ok": true }
```

## 4. 状態取得
`GET /api/rooms/{room}/state?playerId={playerId}`

### Response
```json
{
  "ok": true,
  "room": {
    "roomCode": "123456",
    "ownerId": "p_xxx",
    "phase": "lobby|playing|finished",
    "maxPlayers": 6,
    "stateVersion": 12,
    "rules": { "tequilaCounter": true },
    "players": [
      { "playerId": "p_xxx", "name": "A", "handCount": 8 }
    ],
    "game": {
      "field": [],
      "revolution": false,
      "currentTurnPlayerId": "p_xxx",
      "gameOver": false,
      "ranking": [],
      "fieldMeta": null
    },
    "log": [ { "at": 0, "text": "" } ],
    "serverTime": 0
  },
  "yourHand": []
}
```

## 5. ゲーム開始
`POST /api/rooms/{room}/start`

### Request
```json
{ "ownerId": "p_xxx" }
```

### Response
```json
{ "ok": true }
```

## 6. アクション
`POST /api/rooms/{room}/action`

### Request
```json
{ "playerId": "p_xxx", "type": "play", "cardIds": ["3-0"] }
```

### Response
```json
{ "ok": true, "stateVersion": 13 }
```

## 7. エラーコード
- `ROOM_NOT_FOUND`
- `ROOM_ALREADY_STARTED`
- `ROOM_FULL`
- `ROOM_NOT_PLAYING`
- `PLAYER_NOT_FOUND`
- `NOT_OWNER`
- `NOT_ENOUGH_PLAYERS`
- `NOT_YOUR_TURN`
- `INVALID_PLAY`
- `CARD_NOT_OWNED`
- `FIELD_EMPTY`
- `ROOM_BUSY`
