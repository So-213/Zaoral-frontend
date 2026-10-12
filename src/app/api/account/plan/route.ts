import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/api-helpers';
import { backendFetch, proxyResponse } from '@/lib/backend';

/**
 * ユーザーのプランを変更するAPIエンドポイント
 * PUT /api/account/plan
 *
 * 認証のみNext.jsで行い、バリデーションとプラン更新はSpring Bootが行う。
 */
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await requireAuth();

    // リクエストボディから新しいプランを取得
    const body = await request.json();
    const { plan } = body;

    const response = await backendFetch('/api/account/plan', userId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    return proxyResponse(response);
  } catch (error) {
    // 認証エラーの場合は401を返す
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    return handleApiError(error, 'プラン変更エラー', 'プランの変更に失敗しました');
  }
}
