import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  handleApiError,
  validateRequired,
} from '@/lib/api-helpers';
import { backendFetch, proxyResponse } from '@/lib/backend';

/**
 * プロジェクトを作成するAPIエンドポイント
 * POST /api/projects
 *
 * 認証のみNext.jsで行い、バリデーション・残機チェック・作成はSpring Bootが行う。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, type, name, message } = body;

    // 認証チェック
    const { userId } = await requireAuth();

    const response = await backendFetch('/api/projects', userId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type, name, message }),
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
    return handleApiError(error, 'プロジェクト作成エラー', 'プロジェクトの作成に失敗しました');
  }
}

/**
 * プロジェクトを削除するAPIエンドポイント
 * DELETE /api/projects?id=<projectId>
 *
 * 認証のみNext.jsで行い、所有者チェックと削除はSpring Bootが行う。
 */
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    // バリデーション
    const projectIdValidation = validateRequired(projectId, 'プロジェクトID');
    if (projectIdValidation) return projectIdValidation;

    const response = await backendFetch(
      `/api/projects/${encodeURIComponent(projectId!)}`,
      userId,
      { method: 'DELETE' }
    );

    return proxyResponse(response);
  } catch (error) {
    // 認証エラーの場合は401を返す
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    return handleApiError(error, 'プロジェクト削除エラー', 'プロジェクトの削除に失敗しました');
  }
}
