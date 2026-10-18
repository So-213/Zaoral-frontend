#!/bin/sh
#
# 期限切れプロジェクトの削除をバックエンドに依頼する。cronから呼ばれる。
# 削除の判定(どれを消すか)はバックエンド側の責務で、ここは起動と結果の記録だけを行う。
#
set -eu

# busybox crond は環境変数を引き継ぐ実装になっているが、cron実装によっては
# 最小限の環境しか渡らない。コンテナ起動時に書き出した env を明示的に読み込む。
if [ -f /etc/cron.env ]; then
    # shellcheck disable=SC1091
    . /etc/cron.env
fi

: "${BACKEND_API_URL:?BACKEND_API_URL が設定されていません}"
: "${CRON_SECRET:?CRON_SECRET が設定されていません}"

endpoint="${BACKEND_API_URL}/api/internal/cleanup-expired-projects"

log() {
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') cleanup-expired-projects: $*"
}

log "開始 (${endpoint})"

# --fail: HTTPステータスが4xx/5xxなら非0で終了する(付けないとエラー応答でも成功扱いになる)
# --max-time: バックエンドが応答しないまま次回実行時刻まで残らないようにする
if response=$(curl --fail --silent --show-error --max-time 120 \
        --request POST \
        --header "Authorization: Bearer ${CRON_SECRET}" \
        "${endpoint}" 2>&1); then
    log "成功 ${response}"
else
    status=$?
    log "失敗 (curl exit ${status}) ${response}"
    # 非0で終わらせることで、cronのログやコンテナの終了状態から失敗を追える。
    # リトライはしない(月1回の処理で、取りこぼしは次回の実行で回収される)
    exit "${status}"
fi
