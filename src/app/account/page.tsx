import AccountClient from "@/components/AccountClient";
import { requireAuth } from "@/lib/api-helpers";
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
    // 認証エラーの場合はログインページを表示
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">ログインが必要です</h1>
          <a 
            href="/auth/signin"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ログイン
          </a>
        </div>
      </div>
    );
  }
}
