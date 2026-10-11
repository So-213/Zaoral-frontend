import { NextResponse } from 'next/server';

/**
 * Spring Boot バックエンドへの呼び出し(サーバーサイド専用)。
 *
 * 認証はNext.js側(NextAuth)で済ませており、Spring Bootは `X-User-Id` ヘッダを検証せず信頼する。
 * そのため、このモジュールはブラウザから呼ばれてはならない。環境変数にも NEXT_PUBLIC_ を付けない。
 * 詳細は移行ドキュメントの 04_認証認可切り分け.md を参照。
 */

/**
 * バックエンドのベースURL。
 * Dockerコンテナ内から、ホストで動くSpring Bootを呼ぶ場合は http://host.docker.internal:8080 を指定する
 * (docker-compose.dev.yml で設定済み)。
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

/**
 * バックエンドを呼び出す。
 * Server Component から呼んでもキャッシュされないよう、常に cache: 'no-store' にする。
 */
export function backendFetch(
  path: string,
  userId: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      'X-User-Id': userId,
    },
    cache: 'no-store',
  });
}

/**
 * Server Component 用。JSONを取得して返し、失敗した場合は例外を投げる。
 */
export async function backendGetJson<T>(path: string, userId: string): Promise<T> {
  const response = await backendFetch(path, userId);
  if (!response.ok) {
    throw new Error(`バックエンドの呼び出しに失敗しました: GET ${path} (${response.status})`);
  }
  return (await response.json()) as T;
}

/**
 * Route Handler 用。バックエンドのレスポンスを、ステータスとJSONをそのまま保って返す。
 * バックエンドのエラーも {"error": "..."} 形式で、現行のAPIレスポンスと同じ形になる。
 */
export async function proxyResponse(response: Response): Promise<NextResponse> {
  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}

/**
 * サインアップ時に、バックエンドへ user_quota の初期化を依頼する(冪等)。
 *
 * NextAuth の events.createUser から呼ばれる。events は「イベント」であり、ここで例外を投げても
 * 作成済みの "User" 行はロールバックされない。したがって失敗してもログに残すだけで、例外は投げない。
 * 失敗した場合は "User" だけが存在し user_quota が無い状態になる(受容したリスク。05_DB切り分け.md 参照)。
 */
export async function initializeUserQuota(userId: string): Promise<void> {
  try {
    const response = await backendFetch('/api/internal/user-quota', userId, { method: 'POST' });
    if (!response.ok) {
      console.error(`user_quota の初期化に失敗しました: userId=${userId} status=${response.status}`);
    }
  } catch (error) {
    console.error(`user_quota の初期化に失敗しました: userId=${userId}`, error);
  }
}
