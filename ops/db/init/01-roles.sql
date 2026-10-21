-- DB接続ロールの分離
--
-- postgres公式イメージは /docker-entrypoint-initdb.d/ 配下の *.sql を
-- 「データディレクトリが空の初回起動時のみ」POSTGRES_USER(=zaoral)で自動実行する。
-- 2回目以降の起動では走らないため、変更した場合は down -v でボリュームを作り直すこと。
--
-- 役割分担
--   zaoral          : スーパーユーザー。このロール作成とDB管理専用。アプリもマイグレーションも使わない
--   zaoral_migrator : マイグレーション用。全テーブルのオーナーになり、DDLを打てる唯一のロール
--   zaoral_app      : アプリ用。DMLのみ。DROP/ALTER等は権限エラーになる
--
-- 詳細は docker-compose.dev.yml の migrate サービスのコメント参照。


-- マイグレーション用ロール
-- CREATEDB は `prisma migrate dev` がシャドウDB(差分検出用の一時DB)を作るために必要。
-- `migrate deploy` だけなら不要だが、開発時に migrate dev を使うため付与する
CREATE ROLE zaoral_migrator LOGIN CREATEDB PASSWORD 'zaoral_migrator_dev_password';
GRANT CREATE, USAGE ON SCHEMA public TO zaoral_migrator;

-- アプリ用ロール
-- スキーマへの CREATE は与えない(テーブルを作れない)
CREATE ROLE zaoral_app LOGIN PASSWORD 'zaoral_app_dev_password';
GRANT USAGE ON SCHEMA public TO zaoral_app;

-- zaoral_migrator が今後作るテーブル/シーケンスに zaoral_app の権限を自動付与するルール。
-- GRANT ... ON ALL TABLES は実行時点に存在するテーブルにしか効かない一回限りの処理なので、
-- これが無いとマイグレーションで追加したテーブルがアプリから permission denied になる。
-- 空のDBから始めるため、既存テーブルへの GRANT ON ALL TABLES は不要(対象が存在しない)。
--
-- FOR ROLE の指定は必須。省略すると「この文を実行したロール(=zaoral)が作ったもの」が
-- 対象になり、実際にテーブルを作る zaoral_migrator には適用されない
ALTER DEFAULT PRIVILEGES FOR ROLE zaoral_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zaoral_app;
ALTER DEFAULT PRIVILEGES FOR ROLE zaoral_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO zaoral_app;

-- マイグレーション履歴テーブル(_prisma_migrations)も zaoral_migrator の所有になる。
-- 上の DEFAULT PRIVILEGES の対象に入るが、アプリが読む必要はないので意識しなくてよい。

-- 想定外のロールが public スキーマにテーブルを作るのを塞ぐ。
-- PostgreSQL 15 以降は既定で閉じているが、意図を明示するために書いておく
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
