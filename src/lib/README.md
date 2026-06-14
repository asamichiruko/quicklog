# src/lib/

## auth/

### auth.ts

- supabase.auth 境界
- delete-account Edge Function の呼び出し

### authFeedbackMessage.ts

- 認証エラータイプ・エラーコードからユーザ向けメッセージへの変換

### authFormValidation.ts

- email, password の validator

## cloudSync/

### cloudSyncAccountDeletion.ts

- ユーザデータをローカル匿名データへ退避し、クラウド上から削除するよう要求

### cloudSyncActivation.ts

- ユーザ認証、local 下で匿名データをユーザデータへ合成・移動、失敗時の rollback までを順序付ける helper

### cloudSyncQueue.ts

- cloud/local 間でのデータ同期要求の受け付け・合流処理

### cloudSyncScheduler.ts

- cloud/local 間でのデータ同期要求の delay/cooldown 管理

### quicklogDataSync.ts

- cloud/local 間でのデータの merge と upsert 要求

### runtimeSessionState.ts

- 最新の session と記録された session の比較から現在の同期状態と user scope を決定

### sessionTransition.ts

- auth/session イベント、使用しない userId 情報から RuntimeSessionState を解決する helper

## date/

### calendar.ts

- CalendarDialog 用の日付セル配列の生成

### date.ts

- Date オブジェクトを扱う utility

### dateFormat.ts

- Date オブジェクトからユーザ向け文字列への format

## export/

### browserFile.ts

- browser API 境界

### createQuicklogExportFile.ts

- QuicklogData の JSON 形式文字列への変換、LogEntry[] の Markdown 文字列への変換

## logEntry/

### logEntryCollection.ts

- logEntry[] 配列の sort/merge/grouping 操作

### logEntryDeletionCollection.ts

- logEntryDeletion[] 配列同士の merge 操作

### logEntryDeletionRepository.ts

- logEntryDeletion オブジェクトと supabase DB 上の log_entry_deletions レコードとの境界

### logEntryDeletionSchema.ts

- unknown オブジェクト から LogEntryDeletion[] への parse

### logEntryRepository.ts

- logEntry オブジェクトと supabase DB 上の log_entries レコードとの境界

### logEntrySchema.ts

- unknown オブジェクトから LogEntry[] への parse

## quicklogData/

### anonymousDataMigration.ts

- 匿名データをユーザデータへ合成・移動

### quicklogDataEditing.ts

- QuicklogData のレコード単位での操作

### quicklogDataMerge.ts

- QuicklogData 同士の merge
- LogEntryDeletion の prune

### quicklogDataMigration.ts

- 外部/旧形式データから現行の QuicklogData 形式への変換

## storage/

### dataScopeSchema.ts

- Record から DataScope オブジェクトへの parse

### settings.ts

- ユーザ設定オブジェクトの normalize

### storage.ts

- localStorage 境界

### storageLayoutMigration.ts

- 旧形式の localStorage を現行の localStorage 構成へ移行

## shared/

### sizeLimits.ts

- サイズ上限定数の定義
- UTF-8 文字列からバイト数の取得

### supabase.ts

- supabase オブジェクトの取得
