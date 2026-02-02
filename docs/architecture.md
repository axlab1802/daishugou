# アーキテクチャ設計

## 1. 全体構成
- フロントエンド: Vite + Vanilla JS
- バックエンド: Vercel Serverless Functions（`/api/*`）
- データストア: Vercel Redis（Upstash）

```
Browser
  └─ Static Assets (Vite build)
       └─ /api/rooms/* (Serverless Functions)
             └─ Vercel Redis (Room/Game State)
```

## 2. コンポーネント

### 2.1 フロントエンド
- `index.html`: 画面構造
- `styles.css`: UIスタイル
- `main.js`: 描画、操作、ポーリング
- `rules.json`: 追加ルール定義

### 2.2 API（Vercel Functions）
- `api/rooms/index.js`: ルーム作成
- `api/rooms/[room]/state.js`: 状態取得
- `api/rooms/[room]/join.js`: 参加
- `api/rooms/[room]/leave.js`: 退出
- `api/rooms/[room]/start.js`: 開始
- `api/rooms/[room]/action.js`: アクション

### 2.3 共通ロジック
- `lib/game.js`: ゲームルール/判定
- `lib/roomStore.js`: Redisアクセス/TTL/ロック
- `lib/http.js`: JSON入出力

## 3. データ設計（Redis）

### 3.1 キー
- `room:{code}`: ルーム情報（JSON）
- `room-lock:{code}`: ルーム更新ロック

### 3.2 ルーム構造（要約）
- `roomCode`, `ownerId`, `phase`, `maxPlayers`, `stateVersion`
- `players[]`: `playerId`, `name`, `lastSeenAt`
- `rules`: 追加ルール設定
- `game`: `hands`, `field`, `currentTurnPlayerId`, `ranking`, `revolution`
- `log[]`: 最新のログ

### 3.3 TTL
- ルームの生存期限: 6時間
- 状態取得時に TTL を延長

## 4. 同時実行制御
- `room-lock:{code}` を `NX` で取得
- `action/start/join/leave` はロック取得後に実行
- ロック取得失敗時は `ROOM_BUSY` を返す

## 5. 通信方式
- クライアントは 800ms 間隔でポーリング
- 状態差分ではなく全体サマリーを取得

## 6. デプロイ
- Vercel でビルド（`npm run build`）
- `dist/` を静的配信
- `/api/*` を Serverless Functions として稼働
