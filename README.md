# Chirp - シンプルな X 風アプリ

メールアドレスでサインアップ/ログインして、280 文字までのつぶやきを投稿できる、最小構成の X (旧 Twitter) クローンです。

- フロントエンド: 素の HTML / CSS / JavaScript (ビルド不要)
- バックエンド: [Supabase](https://supabase.com/) (Auth + Postgres + Realtime)
- ホスティング: GitHub Pages などの静的ホスティング

## 機能

- メールアドレス + パスワードでの新規登録 / ログイン / ログアウト
- 280 文字までのつぶやきの投稿
- タイムライン表示 (新しい順)
- 他のユーザーの投稿もリアルタイムで反映 (Supabase Realtime)

## セットアップ

### 1. Supabase プロジェクトを作成

1. <https://supabase.com/> でプロジェクトを作成します。
2. ダッシュボードの **SQL Editor** で [`supabase/schema.sql`](./supabase/schema.sql) の内容を実行します。
   - `posts` テーブルと Row Level Security (RLS) ポリシーが作成されます。
3. **Table Editor** で `posts` テーブルに「RLS enabled」と表示されていることを確認します。
4. **Authentication -> Sign In / Providers -> Email** が有効になっていることを確認します。
   - 動作確認だけなら "Confirm email" を OFF にすると確認メールなしで試せます。
5. **Project Settings -> API** から以下を控えます。
   - `Project URL` (例: `https://xxxxx.supabase.co`)
   - `anon` `public` key (`service_role` key ではありません)

### 2. ローカルで動かす

```bash
cp config.example.js config.js
# config.js を開いて SUPABASE_URL / SUPABASE_ANON_KEY を埋める
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

`config.js` は `.gitignore` で除外されているので GitHub には push されません。

### 3. 公開する

`config.js` はリポジトリに入っていないので、公開先には別途用意する必要があります。例:

- **GitHub Actions + Pages**: Settings -> Secrets and variables -> Actions に `SUPABASE_URL` / `SUPABASE_ANON_KEY` を登録し、ワークフローで `config.js` を生成してから Pages にデプロイする (ワークフローは未同梱)。
- **Netlify / Vercel など**: 環境変数に同じ値を登録し、ビルド時に `config.js` を生成する。

## セキュリティ

- `anon` key はブラウザに渡す前提の公開キーです。データの保護は **RLS に完全に依存** します。RLS が無効だと、anon key だけで全件読み書きできてしまいます。
- 投稿は **ログインユーザーのみ閲覧可能** (未ログインの anon key アクセスでは 0 件) です。
- 投稿には **メールアドレスを保存しません**。`@` より前の部分だけを表示名として保存します。
- 他人の投稿の作成・削除・編集は RLS で禁止しています。
- `service_role` key は RLS を無視できる管理者キーです。**ブラウザにもリポジトリにも絶対に置かないでください。** このアプリでは使いません。
- `.gitignore` で `.env*` (`.env.example` を除く) / `config.js` / `config.local.js` を除外しています。

## ファイル構成

```
.
├── index.html          # マークアップ
├── styles.css          # スタイル
├── app.js              # クライアントロジック (Supabase Auth / 投稿)
├── config.example.js   # 設定テンプレート (git 管理対象)
├── config.js           # 実際の設定 (git 管理対象外・各自作成)
├── .env.example        # 参考用テンプレート
├── .gitignore
└── supabase/
    └── schema.sql      # DB スキーマ + RLS ポリシー
```
