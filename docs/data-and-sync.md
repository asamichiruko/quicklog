# データと同期

## データ構造

quicklog のローカルユーザーデータは `QuicklogData` 型で表されます。

```typescript
type QuicklogData = {
  version: 3
  logEntries: LogEntry[]
  logEntryDeletions: LogEntryDeletion[]
}
```

`version` はユーザーデータ形式のバージョンを表し、現時点での最新バージョンは 3 です。
`version` が最新でない場合は parse 処理の段階でマイグレーションされます。

`logEntries` はユーザーが記録したメモの配列です。ただし、ユーザーが削除したメモはこの中に含まれません。
`LogEntry` 型は以下のように定義されます。

```typescript
type LogEntry = {
  id: string
  text: string
  createdAt: string
}
```

`id` は識別子、`text` は記録の内容です。`createdAt` は ISO 8601 形式の文字列で、ユーザーがメモを作成した時刻を表します。

`logEntryDeletions` はユーザーがメモの削除操作を行った情報を記録する配列です。同期時に削除情報を伝播するために使用されます。
`LogEntryDeletion` 型は以下のように定義されます。

```typescript
type LogEntryDeletion = {
  logEntryId: string
  createdAt: string
}
```

`logEntryId` は削除したメモの `id` を指します。
`createdAt` は ISO 8601 形式の文字列で、ユーザーがメモを削除した時刻を表します。

## データの保存先

quicklog は localStorage および Supabase Database 上にデータを保存します。
保存する内容は以下のとおりです。

### localStorage

- `quicklog.data.user.<user-id>`: サインイン済みユーザーごとの `QuicklogData`
- `quicklog.data.anonymous`: 匿名状態で使用する `QuicklogData`
- `quicklog.settings`: 端末ごとの設定情報
- `quicklog.dataScope`: 前回利用時のデータスコープ情報。サインイン中のユーザーと匿名状態の切り替えを区別するために使用します

### Supabase Database

- `log_entries`: 匿名データ、未同期のデータを除く全ユーザーの `LogEntry` 相当のデータ
  - 各レコードがどのユーザーに紐づいているかは `log_entries.user_id` によって管理されます。
- `log_entry_deletions`: 匿名データ、未同期のデータを除く全ユーザーの `LogEntryDeletion` 相当のデータ
  - 各レコードがどのユーザーに紐づいているかは `log_entry_deletions.user_id` によって管理されます。
- `auth.users`: 全ユーザーのアカウント情報

## LogEntryDeletion の役割

quicklog では、次の目的のために `LogEntryDeletion` を記録します。

- ある端末で削除した `LogEntry` を、同期先のクラウド・別端末からも削除する
- 削除した `LogEntry` が同期によって意図せず復活することを防ぐ

具体例を挙げます。

1. ユーザーが端末 A でメモ X を削除する
2. `QuicklogData.logEntries` からの削除と同時に `QuicklogData.logEntryDeletions` に X の削除情報を追加する
3. クラウド上の `log_entry_deletions` にも同様に X の削除情報を追加する
4. 端末 B で同期を行った際、削除情報を見てメモ X を削除する

ローカル上の `QuicklogData.logEntryDeletions` の肥大化を防ぐため、起動時の読み込みや同期を行う際、作成から 60 日を過ぎた `LogEntryDeletion` は削除されます。
したがって、古いバックアップデータをインポートした場合などに一度削除したメモが復活する場合があります。
ただし、クラウド上の `log_entry_deletions` のレコードは現時点で物理削除していません。
同期時には期限切れの `log_entry_deletions` を取り込まないことで、古いクラウド上の削除情報がローカルに戻らないようにしています。

## 同期の基本方針

- サインインした直後およびサインイン中にのみクラウド同期を行う
- 同期によってローカルデータとクラウドデータをマージする
  - `logEntries` と `logEntryDeletions` の両方をマージする
- 削除情報があるメモはマージデータから取り除く
- マージした後、ローカルとクラウドの双方にマージデータを反映する

`id` には UUIDv4 形式を用いることを仮定しており、異なるデータの `id` が衝突した場合の挙動は未定義です。
また、現時点で quicklog にはメモの編集機能を持たせていないため、同一 `id` を持つメモ内容の編集による衝突は発生しません。

## 匿名状態とサインイン中でのデータの扱い

quicklog では未サインイン時と明示的サインアウト後を匿名状態として扱います。
匿名状態でのデータは各端末の localStorage の `quicklog.data.anonymous` に保存されます。

アカウントの作成を行うと、匿名状態でのデータは `quicklog.data.user.<user-id>` に移行され、そのユーザーが所持するデータとして扱われるようになります。

あるユーザーとしてサインインを行うときに匿名状態でのデータが残っていた場合、まずローカルのユーザーデータに匿名状態のデータをマージ・移行します。
具体的にはユーザーデータと匿名状態のデータのマージ結果を `quicklog.data.user.<user-id>` に保存し、`quicklog.data.anonymous` のデータを削除してからクラウドデータとの同期を行います。
もし同期に失敗した場合でもローカルでのマージ・移行操作は行われたままです。

サインインした状態からサインアウトを行うと、`quicklog.data.user.<user-id>` のデータは localStorage に残され、画面には匿名状態でのデータのみが表示されます。
正常なフローを辿っている限り、このとき匿名データは空であるはずです。

アカウントの削除を行った場合、そのアカウントのデータは `quicklog.data.anonymous` へ移行され、クラウド上と `quicklog.data.user.<user-id>` のデータは削除されます。
ただし、削除したユーザーのデータと元の匿名状態のデータが意図せず混ざることを防ぐため、匿名状態のデータが残っている場合はアカウントの削除を禁止します。

ネットワークエラーなどによってセッションが失われた場合、quicklog では「サインイン中だが同期できないユーザー」として扱われます。データの書き込み先は localStorage の `quicklog.data.user.<user-id>` となり、次に同期に成功したときクラウド上へ反映されます。

## 既知の制約

- localStorage にはブラウザによって 5 MB から 10 MB 程度の容量制限があります。
  - 容量制限によるデータ移行の失敗、巨大なデータによるメモリ不足などを避けるため、localStorage へ保存するデータのサイズ、インポートファイルのサイズ、エクスポートデータのサイズを 2 MiB に制限しています。
- 一度記録したメモの編集機能は実装していません。
- クラウド上の `log_entry_deletions` のレコードは現時点では物理削除されません。
- `LogEntry.id` に使用する文字列は UUIDv4 形式を想定しており、ユーザーの記録操作に伴う `LogEntry` の作成では UUIDv4 文字列を生成して使用していますが、parse 時には文字列が UUIDv4 形式であることを検証していません。
