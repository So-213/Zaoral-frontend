-- "User" 行の作成に user_quota 行の作成を追従させる。
--
-- 元は Spring Boot 側の Flyway(V2__user_quota_autocreate.sql)にあったものを、
-- スキーマ適用をDB作成プロセスへ一元化した際に移植した。内容は無変更。
--
-- SECURITY DEFINER にはしない。トリガは "User" に INSERT する接続(zaoral_app)の権限で動くため、
-- user_quota への INSERT 権限が必要になる。これは ops/db/init/01-roles.sql の
-- ALTER DEFAULT PRIVILEGES によって zaoral_app へ自動付与されている。
CREATE FUNCTION create_user_quota() RETURNS TRIGGER AS $$
BEGIN
    -- plan / left_projects は指定しない。初期値は user_quota 側の DEFAULT を単一の正とする。
    INSERT INTO user_quota (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER INSERT は「コミット後」ではなく、同一トランザクション内でその行のINSERT直後に動く。
-- したがってトリガが失敗すれば "User" の INSERT ごとロールバックされる。
CREATE TRIGGER user_quota_autocreate
AFTER INSERT ON "User"
FOR EACH ROW EXECUTE FUNCTION create_user_quota();

-- 空のDBから流す場合は対象が無く何もしない。既存DBへ後から適用する場合の取りこぼし対策として残す。
INSERT INTO user_quota (user_id)
SELECT u.id FROM "User" u
LEFT JOIN user_quota q ON q.user_id = u.id
WHERE q.user_id IS NULL;
