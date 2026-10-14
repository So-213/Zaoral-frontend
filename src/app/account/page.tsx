import AccountClient from "@/components/AccountClient";
import { AuthRequiredNotice, DataFetchErrorNotice } from "@/components/PageNotice";
import { AuthRequiredError, requireAuth } from "@/lib/api-helpers";
import { backendGetJson } from "@/lib/backend";

// バックエンド(GET /api/account/quota)のレスポンス
interface Quota {
  plan: string;
  left_projects: number;
}

export default async function AccountPage() {
  try {
    const { session, userId } = await requireAuth();

    // プラン情報はSpring Bootから取得する
    const quota = await backendGetJson<Quota>("/api/account/quota", userId);

    return <AccountClient session={session} userPlan={quota.plan} />;
  } catch (error) {
    // 未認証とバックエンド障害を区別する。まとめて扱うと、ログイン済みなのに
    // バックエンドが落ちているだけのユーザーに「ログインが必要です」を見せてしまう
    if (error instanceof AuthRequiredError) {
      return <AuthRequiredNotice />;
    }

    console.error('アカウントページの表示に失敗しました:', error);
    return <DataFetchErrorNotice retryHref="/account" />;
  }
}
