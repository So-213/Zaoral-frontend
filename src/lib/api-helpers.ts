import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * 認証エラーを表すエラー型。
 *
 * 呼び出し側が「未認証」と「それ以外の失敗(バックエンド障害など)」を区別できるようにするため、
 * requireAuth() は素の Error ではなくこの型を投げる。
 * 区別しないと、バックエンドが落ちているだけのログイン済みユーザーに
 * 「ログインが必要です」を表示してしまう。
 */
export class AuthRequiredError extends Error {
  constructor(message: string = '認証が必要です') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

/**
 * 認証チェック用のヘルパー関数
 * @returns 認証されたユーザー情報とセッション情報
 * @throws 認証されていない場合は AuthRequiredError を投げる
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthRequiredError();
  }

  return {
    session,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Anonymous"
  };
}

/**
 * 統一されたエラーハンドリング用のヘルパー関数
 * @param error エラーオブジェクト
 * @param context エラーが発生したコンテキスト（ログ用）
 * @param userMessage ユーザー向けエラーメッセージ
 * @returns NextResponse
 */
export function handleApiError(
  error: unknown,
  context: string,
  userMessage: string = 'サーバーエラーが発生しました'
): NextResponse {
  console.error(`${context}:`, error);

  return NextResponse.json(
    { error: userMessage },
    { status: 500 }
  );
}

/**
 * バリデーション用のヘルパー関数
 * @param value 検証する値
 * @param fieldName フィールド名
 * @returns バリデーションエラーレスポンスまたはnull
 */
export function validateRequired(
  value: unknown,
  fieldName: string
): NextResponse | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return NextResponse.json(
      { error: `${fieldName}が必要です` },
      { status: 400 }
    );
  }
  return null;
}
