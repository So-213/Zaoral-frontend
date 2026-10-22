-- "User" 行の作成に user_quota 行の作成を追従させる。
--
-- 元は Spring Boot 側の Flyway(V2__user_quota_autocreate.sql)にあったものを、
-- スキーマ適用をDB作成プロセスへ一元化した際に移植した。内容は無変更。
--
-- 背景: user_quota はサインアップ時に Next.js → Spring Boot の初期化API呼び出しで作られていた。
-- この呼び出しは "User" 行のコミット後に実行されるため、失敗しても "User" はロールバックされず、
-- 「"User" はあるが user_quota が無い」ユーザーが生まれ、自動回復しなかった(dual-write問題)。
--
-- 対処: 行の作成を "User" への INSERT と同一トランザクションに入れ、DB自身に実行させる。
-- user_quota.user_id の ON DELETE CASCADE が削除方向を保証しているのと対になる、作成方向の保証。
-- SQLに ON INSERT CASCADE は存在しないためトリガで実現する。
--
-- トリガの実在は Spring Boot の QuotaConsistencyChecker が起動時に検査する(検知のみ・修復はしない)。
-- アプリはスキーマを作らず前提の検証だけを行う、という役割分担。

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
