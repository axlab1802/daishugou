# アーキテクチャ設計

## 1. 全体構成
- **クライアントのみ**で完結するSPA風の静的構成
- HTML/CSS/JavaScript（バニラJS）で実装
- ビルド不要、`index.html` を開くだけで動作
- 開発時は Vite を利用してホットリロード

```
/ (project root)
├─ index.html        // 画面構造
├─ styles.css        // UIスタイル・アニメーション
└─ main.js           // ゲーム状態と描画
└─ server.js         // オンラインAPI + 静的配信
└─ vite.config.js    // Vite設定（APIプロキシ）
└─ rules.json        // 追加ルール設定（デフォルト）
└─ assets/sfx/        // 効果音（sfx.json + wav）
└─ tools/            // カード生成ツール
```

## 2. 主要モジュール

### 2.1 画面レイヤー（index.html）
- ヘッダー、情報バー、相手手札、場、メッセージ、自分の手札、操作ボタンを配置
- DOM要素にIDを付与し、JS側から描画更新

### 2.2 スタイルレイヤー（styles.css）
- トランプの質感を表現するカードデザイン
- 背景はバーの雰囲気を演出するグラデーション
- レスポンシブ対応（可変幅カード + 余白調整）

### 2.3 ロジックレイヤー（main.js）
- `CARD_SPECS`: カード仕様のマスタ
- `JOKER_RANK` / `JOKER_CARD`: ジョーカー専用定義（1枚のみ）
- `state`: ゲーム状態（手札・場・メッセージ等）
- `state.rules`: 追加ルール設定（rules.json + LocalStorage）
- `state.sfx`: 効果音の設定（sfx.json）
- `render*`: 描画更新関数
- `playSelected` / `passTurn`: 最小限の操作ロジック
- GSAP: コンボ/革命/場流しなどの演出アニメーション
- `players`: 最大6人（人間1 + CPU1〜5）を管理

### 2.4 サーバーレイヤー（server.js）
- Node.js のHTTPサーバーでAPI提供
- ルーム状態はメモリ保持（簡易版）
- 静的ファイル配信も兼任
- 開発時は Vite の `/api` プロキシ先として利用
- ルーム作成時に追加ルールを保持し、プレイ検証にも適用

### 2.5 アセット生成（tools/）
- `tools/card_layout.json` でカードレイアウトを定義
- `tools/generate_cards.py` でSVGカードを一括生成
- ジョーカーは `assets/joker.png` をそのまま使用

## 3. 状態管理

```javascript
state = {
  playerHand: [],
  opponentHandCount: 10,
  field: [],
  selectedIds: new Set(),
  revolution: false,
  message: "あなたのターンです",
}
```

- **UI更新は常に state を基準**に再描画
- UIイベント（クリック/ボタン）→ state 更新 → render

## 4. 描画フロー

1. 初期化時にデッキ生成と手札配布
2. `renderAll()` で全UIを描画
3. 操作イベントで state を更新
4. `renderAll()` / `renderInfo()` を再実行

## 5. 将来拡張ポイント
- **ゲームルール**: 強さ判定・革命・コンボ判定を `main.js` に追加
- **CPU思考**: `decideCPUPlay()` を実装しターン進行
- **オンライン対戦**: `/api/*` と状態同期ロジックを追加
