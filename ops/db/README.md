# DB作成プロセス

スキーマを適用する唯一の主体。アプリ(Next.js / Spring Boot / Zaoral_backend3)はDDLを打たない。

## なぜアプリから分離しているか

`projects` の消費者は Next.js・Spring Boot・Zaoral_backend3 の3つある。消費者が複数いる
スキーマを、そのうち1つのアプリの所有物として扱うと所有関係が歪むため、スキーマは共有の
コントラクトとして独立させ、適用も専用プロセスに切り出している。

以前は「認証テーブルはPrisma(Next.js)所有、業務テーブルはFlyway(Spring Boot)所有」という
分担だったが、Flywayへ一元化した。

## 構成

| ディレクトリ | 内容 | 実行者 |
|---|---|---|
| `init/` | ロール作成 | postgresイメージ(初回起動時のみ、スーパーユーザー) |
| `migration/` | スキーマ本体 | `migrate` サービス(Flyway、`zaoral_migrator`) |

ロールは3つ。詳細は [init/01-roles.sql](./init/01-roles.sql) 参照。

| ロール | 用途 | 権限 |
|---|---|---|
| `zaoral` | DB管理・ロール作成のみ | スーパーユーザー |
| `zaoral_migrator` | スキーマ適用(Flyway) | DDL可。全テーブルのオーナー |
| `zaoral_app` | 各アプリの実行時接続 | DMLのみ |

## 適用

`docker compose -f docker-compose.dev.yml up` で `migrate` サービスが自動で走り、
完了後に `app` が起動する(`service_completed_successfully`)。失敗した場合はアプリが
起動しないため、スキーマ不整合のまま動き出すことはない。

手動で流す場合:

```bash
docker compose -f docker-compose.dev.yml run --rm migrate migrate
```

状態確認:

```bash
docker compose -f docker-compose.dev.yml run --rm migrate info
```

### ロールを作り直す場合

`init/` は postgres イメージがデータディレクトリが空の初回起動時のみ実行する。
変更した場合はボリュームごと作り直す(開発データは消える):

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up
```

## スキーマを変更する

`migration/` に `V<n>__<説明>.sql` を追加する。既に適用済みのファイルは編集しない
(Flywayがチェックサムで検知して失敗する)。

### 業務テーブル

SQLを手書きする。

### 認証テーブル(NextAuth)

`prisma/schema.prisma` が編集面として残っている。Prisma Client の型がそこから生成される
ため、SQLとモデルの両方を更新する必要がある。SQLの下書きは Prisma に出させられる。

```bash
# 1. prisma/schema.prisma のモデルを編集
# 2. 実体との差分SQLを出力(ホストにnodeが無いためコンテナ内で実行する)
docker compose -f docker-compose.dev.yml exec app npm run db:diff
# 3. 認証テーブルに関する文だけを抜き出して migration/V<n>__*.sql として保存
# 4. 適用
docker compose -f docker-compose.dev.yml run --rm migrate migrate
```

`prisma migrate dev` / `migrate deploy` / `db push` は実行しないこと。schema.prisma に
存在しないテーブル(業務テーブル)に対して `DROP` を生成する。

#### 手順3で選別が必要な理由

`prisma migrate diff` は **DB全体**を schema.prisma と比較する。schema.prisma には認証4
テーブルしか載っていないため、以下は常に `DROP TABLE` として出力される。すべて破棄する。

- `projects` / `projects_message` / `projects_picture` / `user_quota`
- `flyway_schema_history`

この性質上、「出力が空なら乖離なし」という自動チェックには使えない。認証テーブルの変更は
`db:diff` の出力を読んで必要な文だけ採る、という手作業が前提になる。

schema.prisma と実体が乖離すると、型は通るのに NextAuth が実行時に落ちる(カラムが無い等)。
認証テーブルを触ったときは `db:diff` の出力に**認証テーブルに関する文が残っていないこと**を
確認する。残っていれば、その分だけSQLが未適用ということ。

将来ここを自動チェックにしたい場合は、認証テーブルを専用のPostgresスキーマ(`auth` 等)へ
分離すると Prisma の比較範囲を限定できる。本構成では未実施。
