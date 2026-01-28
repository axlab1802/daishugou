# API仕様

## 1. 方針
- 現状はクライアントのみで動作
- 将来のオンライン対戦に備え、APIの案を定義
- 形式: JSON

## 2. エンドポイント一覧（案）

### 2.1 ルーム作成
- `POST /api/rooms`
- Request
```json
{
  "ownerName": "A",
  "maxPlayers": 4,
  "turnTimeLimitSec": 30,
  "rules": {
    "tequilaCounter": true,
    "ochokoReset": true,
    "kanpaiBonus": true
  }
}
```
- Response
```json
{
  "roomCode": "483921",
  "ownerId": "p_owner",
  "rules": {
    "tequilaCounter": true,
    "ochokoReset": true,
    "kanpaiBonus": true
  }
}
```

### 2.2 参加
- `POST /api/rooms/{roomCode}/join`
- Request
```json
{
  "name": "B"
}
```
- Response
```json
{
  "playerId": "p2"
}
```

### 2.3 退出
- `POST /api/rooms/{roomCode}/leave`
- Request
```json
{
  "playerId": "p2"
}
```

### 2.4 ゲーム開始
- `POST /api/rooms/{roomCode}/start`
- Request
```json
{
  "ownerId": "p_owner"
}
```

### 2.5 状態取得（ポーリング）
- `GET /api/rooms/{roomCode}/state?playerId={playerId}`
- Response
```json
{
  "stateVersion": 12,
  "phase": "playing",
  "rules": {
    "tequilaCounter": true,
    "ochokoReset": true,
    "kanpaiBonus": true
  },
  "game": {
    "currentTurnPlayerId": "p1",
    "field": [],
    "revolution": false,
    "turnDeadlineAt": null
  },
  "players": [
    { "playerId": "p1", "name": "A", "disconnected": false, "handCount": 8 },
    { "playerId": "p2", "name": "B", "disconnected": false, "handCount": 9 }
  ],
  "yourHand": []
}
```

### 2.6 アクション送信
- `POST /api/rooms/{roomCode}/action`
- Request
```json
{
  "playerId": "p1",
  "type": "play",
  "cardIds": ["7-0", "7-2"]
}
```
- Response
```json
{
  "ok": true,
  "stateVersion": 13
}
```

## 3. エラーレスポンス
```json
{
  "ok": false,
  "error": "ROOM_NOT_FOUND"
}
```

## 4. データ構造
- docs/specification.md の RoomState 定義を採用
- カードは `rank` で強さを判定し、ジョーカーは `rank: 16`（1枚のみ、2より強い）
- ジョーカーの例: `{ "id": "joker", "rank": 16, "name": "ジョーカー", "suit": "joker" }`
