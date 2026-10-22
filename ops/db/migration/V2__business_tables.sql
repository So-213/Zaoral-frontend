-- 業務テーブル。
--
-- 元は Spring Boot 側の Flyway(src/main/resources/db/migration/V1__init.sql)が
-- 作っていたものを、スキーマ適用をDB作成プロセスへ一元化した際に移植した。内容は無変更。
--
-- 読み書きするのは Spring Boot(JPA)と Zaoral_backend3(projects を直接参照)。
-- 消費者が複数いるため、どのアプリの所有物でもない共有のコントラクトとして扱う。
--
-- "User" への外部キーがあるため V1 の後に適用される必要がある。Flywayがバージョン順に
-- 適用するので、以前のような「Prismaを先に流す」という手順上の約束は不要になった。

-- plan / left_projects を "User" から切り出したテーブル
CREATE TABLE user_quota (
    user_id       TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
    plan          VARCHAR(16) NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PREMIUM')),
    left_projects INTEGER     NOT NULL DEFAULT 3
);

-- 基底テーブル(共通属性)。IDはアプリケーション側で生成し、DEFAULTは持たせない。
CREATE TABLE projects (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    user_name  TEXT NOT NULL,
    type       VARCHAR(16) NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'picture')),
    slug       TEXT NOT NULL UNIQUE,
    name       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_projects_user_created ON projects (user_id, created_at DESC);

-- 子テーブル(message タイプ専用属性)
CREATE TABLE projects_message (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    message    TEXT NOT NULL
);

-- 子テーブル(picture タイプ専用属性)。picture型は現在停止中だがテーブルは用意する。
CREATE TABLE projects_picture (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    s3_key     TEXT NOT NULL
);
