# 実装タスク一覧（Vercelデプロイ対応）

## 1. ドキュメント
- [x] 要件定義の更新（Vercel/KV/6人/ニックネーム）
- [x] アーキテクチャ設計の更新
- [x] UIデザイン仕様の更新
- [x] API仕様の更新
- [x] READMEの更新
- [x] つまづきメモ更新

## 2. サーバーサイド移行（Vercel Functions）
- [x] ゲームロジックを `lib/` に分離
- [x] KVストア操作（保存/取得/TTL/ロック）実装
- [x] `/api/rooms` ルーム作成
- [x] `/api/rooms/{room}/join` 参加
- [x] `/api/rooms/{room}/leave` 退出
- [x] `/api/rooms/{room}/state` 状態取得
- [x] `/api/rooms/{room}/start` 開始
- [x] `/api/rooms/{room}/action` アクション

## 3. フロント調整
- [x] ニックネーム自動入力（LocalStorage）
- [x] ルームビジー時の再試行UX
- [x] ポーリング間隔の調整・バックオフ

## 4. モバイル/6人UI
- [x] 6人時のカードサイズ最適化
- [ ] スマホ縦持ちでの視認性テスト（実機確認）

## 5. デプロイ設定
- [x] `vercel.json` 追加
- [x] `@vercel/kv` 依存追加
- [ ] Vercel 環境変数の整理（KV接続情報）
- [ ] 本番動作確認
