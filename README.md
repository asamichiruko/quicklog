# quicklog

毎日の記録をすばやく残すための、シンプルな Web アプリです。

## 概要

quicklog は「思いついたことをスムーズに記録できる」ことを目指した個人用のメモアプリです。
高度なメモの分類・管理機能よりも入力の速さと手軽さを重視しています。

記録したメモはブラウザの localStorage に保存されます。

## コンセプト

- 記録のハードルを下げる
- 操作を最小限にする
- 機能をシンプルに保つ

## 機能

- メモの追加
- Ctrl / Cmd + Enter ショートカットキーによるメモの記録
- メモ一覧のタイムライン表示（新しい順）
- メモの削除
- 日別のメモ時刻布の表示（表示切り替え可）
- カレンダーから各日のメモへジャンプ
- JSON / Markdown 形式でのエクスポート
- quicklog からエクスポートした JSON データのインポート

## 技術スタック

- Vue 3
- TypeScript
- Vite
- localStorage

## セットアップ

```bash
npm install
npm run dev
```

起動後、ターミナルに表示されるローカル URL をブラウザで開きます。

## ビルド

```bash
npm run build
```

## 型チェック

```bash
npm run type-check
```

## テスト

```bash
npm run test:run
```

## 第三者ライセンス

このプロジェクトは Bootstrap Icons (MIT License) のアイコンを使用しています。

- [Bootstrap Icons](https://icons.getbootstrap.com/)
