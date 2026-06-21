# quicklog

思いついたことをすばやく記録する Web ベースのメモ帳アプリ。

## 概要

quicklog は「開いてすぐにメモを取れる」ことをコンセプトとした Web アプリです。
記録したメモはタイムライン上に並び、スクロールして読み返すことができます。
データは各端末のローカルストレージに保存され、サインインすることで複数端末間のクラウド同期が可能です。

## コンセプト

- 記録のハードルを下げる
- 必要な操作を最小限にする
- 機能をシンプルに保つ

## 主な機能

### メモの記録と削除

- プレーンテキスト形式でメモを記録
- メモを一件ずつ削除

### メモの読み返し

- 記録したメモをタイムラインで表示
- メモを日付ごとに自動でグループ化
- カレンダーからメモのある日付を選択して移動
- 日ごとの記録件数と記録時刻の分布を表示

### インポート / エクスポート

- 指定した期間のメモを Markdown 形式でクリップボードにコピー
- 全件データを JSON または Markdown 形式でエクスポート
- JSON 形式のデータをインポート

### クラウド同期

- メールアドレスとパスワードによるアカウント作成とサインイン
- ローカルデータとクラウド上のデータを同期
- 端末上のデータをサインイン中のアカウントごとに分離
- アカウントとクラウド上に保存されたデータを削除

## 技術スタック

- Vue 3
- TypeScript
- Vite
- Supabase
- localStorage
- Vitest

## 開発環境のセットアップ手順

### 動作確認済みの環境

- Windows 11 + WSL2 + Ubuntu

### 動作確認時のソフトウェアバージョン

以下のバージョンで動作することを確認しています。

- Git 2.43
- npm 11.12
- Node.js 22.17
- Docker Desktop 4.78
- Deno 2.8.3

### Windows + WSL2 に関する補足

- Docker Desktop を起動し、WSL Integration を有効にしてください
- プロジェクトは WSL2 側のファイルシステムに配置してください
- コマンドは WSL2 の Ubuntu 上で実行してください

### Git リポジトリの clone

```bash
git clone https://github.com/asamichiruko/quicklog.git
cd quicklog
```

以降は `quicklog` 以下で作業を行います。

### 依存パッケージのインストール

```bash
npm install
```

### ローカル Supabase 環境の起動

```bash
npx supabase start
```

実行後に APIs と Authentication Keys が表示されます。次の項目を確認してください。

- APIs > Project URL (<http://127.0.0.1:54321> など)
- Authentication Keys > Publishable (sb*publishable*\*\*\* など)

### 環境変数ファイルの作成

プロジェクトルートに `.env.local` ファイルを作成し、次の内容で保存します。
`<Project URL>` と `<Publishable Key>` を先ほど確認した値で置き換えてください。

```env
VITE_SUPABASE_URL=<Project URL>
VITE_SUPABASE_ANON_KEY=<Publishable Key>
```

現在の実装では、Supabase の Publishable Key を `VITE_SUPABASE_ANON_KEY` に設定します。

### ローカル Supabase DB の初期化

```bash
npx supabase db reset
```

この操作を実行すると、ローカル Supabase 上のデータがリセットされます。

### フロントエンド開発サーバー (Vite) の起動

新たにターミナルを開いて次のコマンドを実行します。

```bash
npm run dev
```

実行後に表示されるアドレス (<http://localhost:5173/> など) からローカル開発環境にアクセスできます。

### ローカル Supabase 環境の停止

```bash
npx supabase stop
```

ローカル Supabase のデータを残さずに停止する場合は、次のコマンドを実行してください。

```bash
npx supabase stop --no-backup
```

### 開発環境の削除

clone したリポジトリのディレクトリを削除します。

## 開発で使用するコマンド

### linting

ESLint による lint を行います。

```bash
npm run lint
```

自動修正が可能な場合は以下のコマンドで実行できます。

```bash
npm run lint:fix
```

### formatting

Prettier による整形を行います。

```bash
npm run format
```

整形が必要な箇所の確認だけを行う場合は以下のコマンドを実行します。

```bash
npm run format:check
```

### 型チェック

TypeScript の型チェックを行います。

```bash
npm run type-check
```

### テスト

以下のコマンドで Vitest のテストプロセスを起動します。

```bash
npm run test
```

テストを一度だけ実行する場合は以下のコマンドを使用します。

```bash
npm run test:run
```

### ビルド

```bash
npm run build
```

## Supabase について

quicklog はアカウント認証、クラウド同期、アカウント削除処理のために [Supabase](https://supabase.com/) プラットフォームを使用しています。

ローカル開発では Supabase CLI によりローカル Supabase 環境を起動します。
このため、フロントエンド開発サーバーとは別に Docker Desktop を起動しておく必要があります。

本番環境で動作させる場合は別途 Supabase プロジェクトを作成し、マイグレーションと環境変数の設定、Edge Function のデプロイを行う必要があります。

## 技術的な詳細ドキュメント

- [データ構造と同期](docs/data-and-sync.md)

## 現在の制約と注意点

quicklog は個人利用を主目的として開発しています。
不特定多数のユーザーによる利用や、継続的なサポートを前提とした運用体制は整えていません。
また、仕様は予告なく変更する場合があります。

### アカウントと同期

- アカウント認証に Supabase Auth を使用しています
- 現在は Supabase 標準のメール送信機能に依存しているため、メール送信数に上限があります
- パスワードの再設定や変更には対応していません
- ソーシャルアカウントによるサインインには対応していません
- クラウド同期は複数端末で利用できますが、すべての状況の網羅的な検証は行っていません

### データの保存

- ローカルデータはブラウザの localStorage に保存しています
- ブラウザのサイトデータを削除すると、端末上のローカルデータは失われます
- localStorage の容量を超えるような大量のデータ保存は想定していません
- 添付ファイルや画像の保存には対応していません

### 対応環境について

- 主に Windows Chrome および iOS Safari で動作確認しています
- macOS やその他の Linux 環境での開発環境の構築は未検証です
- Supabase を利用しない構成でのセットアップには対応していません

## ライセンス

このリポジトリ全体には、現時点でオープンソースライセンスを設定していません。
ソースコードなどの利用を希望する場合は、事前に著作権者の許可を得てください。

### 第三者ライセンス

このプロジェクトでは、第三者ライブラリとして Bootstrap Icons を使用しています。

- Bootstrap Icons
  - License: MIT License
  - Copyright: Copyright (c) 2019-2024 The Bootstrap Authors
  - URL: <https://icons.getbootstrap.com/>
