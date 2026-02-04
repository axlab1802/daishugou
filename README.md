# 酔いどれ大富豪

トランプの大富豪を「お酒カード」に置き換えたカードゲームです。中世の酒場をイメージしたUIと、トランプ風カード表現を重視しています。Vercelにデプロイして、モバイルで最大6人のオンライン対戦が可能です。

## できること
- ローカル対戦（CPU 1〜5人）
- オンライン対戦（2〜6人、ポーリング同期）
- コンボ判定/革命/ジョーカー対応
- 追加ルールのON/OFF切替
- 効果音/演出
- ニックネームの自動入力

## 使い方（ローカル）
1. `npm install`
2. APIあり: `npm run dev:all`
3. クライアントのみ: `npm run dev`
4. `http://localhost:5173` を開く

API付きで動かす場合は `http://localhost:3000` のAPIを使用します。

## 使い方（Vercel）
- `npm run build` で `dist/` を生成
- `vercel.json` に従って静的配信 + `/api/*` をFunctionsとして動作
- Vercel Redis の `REDIS_URL` を環境変数に設定

## ディレクトリ構成
- `index.html` 画面構造
- `styles.css` UIスタイル
- `main.js` 描画・状態管理
- `api/` Vercel Functions
- `lib/` ゲームロジック/KV操作
- `docs/` 仕様/設計ドキュメント

## ドキュメント
- `docs/requirements.md` 機能要件
- `docs/architecture.md` アーキテクチャ
- `docs/ui-spec.md` UIデザイン仕様
- `docs/api-spec.md` API仕様
- `docs/tasks.md` 実装タスク
- `docs/knowhow.md` 実装メモ

## カードSVGの一括生成
1. `tools/card_layout.json` を編集
2. `tools/generate_cards.py` を実行（仮想環境のPython）
3. 出力先: `public/assets/generated`

## 注意
- オンライン対戦はポーリング同期のため、接続環境で若干の遅延があります。
- ルームは一定時間アクセスがないと自動削除されます。
