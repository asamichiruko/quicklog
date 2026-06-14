# quicklog

毎日の記録をすばやく残すための、シンプルな Web アプリです。

## 概要

quicklog は「思いついたことをスムーズに記録できる」ことを目指した個人用のメモアプリです。
高度なメモの分類・管理機能よりも入力の速さと手軽さを重視しています。

記録したメモは端末内に保存され、サインインすることで Supabase を通してクラウド同期できます。

## コンセプト

- 記録のハードルを下げる
- 操作を最小限にする
- 機能をシンプルに保つ

## 機能

### 記録

- メモの追加
- Ctrl / Cmd + Enter による記録
- メモの削除

### 振り返り

- 日付ごとのタイムライン表示
- 日別件数・時刻分布の表示
- カレンダーから記録のある日へ移動

### インポート / エクスポート

- 指定期間の記録を Markdown としてコピー
- JSON / Markdown 形式でのデータのエクスポート
- JSON 形式データのインポート

### クラウド同期

- メールアドレス・パスワードによるサインアップ / サインイン
- Supabase を使ったクラウド同期
  - サインイン前の記録とユーザごとの記録は分けて保存されます

## 技術スタック

- Vue 3
- TypeScript
- Vite
- Supabase
- localStorage
- Vitest

## 開発

### 依存関係のインストール

```bash
npm install
```

### 開発サーバの起動

```bash
npm run dev
```

起動後、ターミナルに表示されるローカル URL をブラウザで開きます。

### 型チェック

```bash
npm run type-check
```

### テスト

```bash
npm run test:run
```

### ビルド

```bash
npm run build
```

## Supabase のセットアップ

クラウド同期を利用するには、Supabase プロジェクトを作成し、認証・データベース・Edge Function を設定します。

### 全体の流れ

1. Supabase プロジェクトを作成する
2. Authentication で Email / Password 認証を有効にする
3. Supabase SQL Editor で `supabase/setup.sql` を実行する
4. Project Settings > API から Project URL と anon public key を確認する
5. プロジェクトルートに `.env.local` を作成する
6. `delete-account` Edge Function をデプロイする

### Authentication

Email / Password 認証を有効にしてください。

### Database

SQL Editor 上で `supabase/setup.sql` を実行します。

`supabase/setup.sql` は新規プロジェクトに対して一度だけ実行する初期セットアップ用です。

### 環境変数

プロジェクトルートに `.env.local` を作成します。

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Edge Function

ユーザアカウント削除機能では、Supabase Auth のユーザ削除を行うために Edge Function を使用します。

Supabase CLI でログインし、対象プロジェクトを link します。

```bash
supabase login
supabase link --project-ref your-project-ref
```

Edge Function をデプロイします。

```bash
supabase functions deploy delete-account
```

この関数は、サインイン中のユーザ自身のアカウントと関連データを削除するために使用します。

## 第三者ライセンス

このプロジェクトは Bootstrap Icons (MIT License) のアイコンを使用しています。

- [Bootstrap Icons](https://icons.getbootstrap.com/)
