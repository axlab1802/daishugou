# 酔いどれ大富豪

トランプの大富豪を「お酒カード」に置き換えたカードゲームのプロトタイプです。中世の酒場をイメージしたUIと、トランプ風カードの表現を重視しています。

## できること（現状）
- 画面レイアウトの表示
- トランプ風カードの描画
- 手札の選択/解除
- 「出す」「パス」の挙動（強さ判定/場流し/革命）
- コンボ判定とコンボ演出
- ジョーカー（1枚のみ、2より強い）
- CPUターン進行（簡易AI）
- CPU1〜5人の対戦人数選択（最大6人レイアウト）
- オンライン対戦（ロビー/参加/開始/ポーリング）

## 使い方
1. このリポジトリを開く
2. ローカル対戦: `index.html` をブラウザで開く
3. オンライン対戦: `node server.js` を実行し `http://localhost:3000` を開く

## Viteでホットリロード（開発）
1. `npm install`
2. APIも使う場合: `npm run dev:all`（Vite + API を同時起動）
3. クライアントのみ: `npm run dev`
4. ブラウザで `http://localhost:5173` を開く（`/api` は `http://localhost:3000` にプロキシ）

## 追加ルール設定
- `rules.json` にルール定義とデフォルトON/OFFを保存
- 画面の「追加ルール」チェックボックスで切り替え（未実装ルールは無効）
- 変更はローカル設定として保存（LocalStorage）

## 効果音
- `assets/sfx/sfx.json` に効果音一覧と割り当てを定義
- `assets/sfx/*.wav` が再生される（必要なら mp3 を追加して差し替え）

## カードSVGの一括生成
1. `tools/card_layout.json` を編集
2. `tools/generate_cards.py` を実行（仮想環境のPython）
3. 出力先: `assets/generated`
4. 生成SVGは画像を埋め込み済み（file://でも表示可能）

## 構成
- `index.html` 画面構造
- `styles.css` UIスタイル
- `main.js` 描画・状態管理
- `docs/` 仕様/設計ドキュメント

## ドキュメント
- `docs/requirements.md` 機能要件
- `docs/specification.md` 詳細仕様
- `docs/architecture.md` アーキテクチャ
- `docs/ui-spec.md` UIデザイン仕様
- `docs/api-spec.md` API仕様（将来案）
- `docs/tasks.md` 実装タスク
- `docs/knowhow.md` 実装メモ

## 今後の予定
- ルール拡張（縛り/階段などの追加）
- CPU思考ロジックの強化
- 演出/アニメーションの拡充
