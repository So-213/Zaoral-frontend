import { NextRequest, NextResponse } from 'next/server';

/**
 * 期限切れプロジェクトのクリーンアップ処理
 *
 * フロント/バックエンド分離に伴い、業務テーブルはSpring Boot所有となりPrismaのスキーマから外れたため、
 * 機能を放棄して無効化している(移行計画書「スコープ外」参照)。
 * 期限切れプロジェクトの削除は、移行完了後にSpring Boot側で実装し直す(将来やること.md A-1)。
 */
export async function GET(request: NextRequest) {
  // 機能放棄のため無効化
  return NextResponse.json(
    { error: '期限切れプロジェクトの削除は現在無効化されています' },
    { status: 503 }
  );

  // 以下は参考用(Spring Boot側で再実装する際の元仕様)。
  //
  // 期限切れプロジェクトのクリーンアップ処理
  // expires_atから31日経過したプロジェクトを削除する
  // このエンドポイントはVercel Cronから月1回呼び出される
  // 認証はVercel CronのAuthorizationヘッダーで行う
  //
  //   const authHeader = request.headers.get('authorization');
  //   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  //   }
  //   const thirtyOneDaysAgo = new Date();
  //   thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
  //   // expires_atが31日前以前のプロジェクトを削除(Cascadeで関連するProjectMessageも削除される)
  //   const result = await prisma.project.deleteMany({
  //     where: { expires_at: { lte: thirtyOneDaysAgo } },
  //   });
}
