import Link from "next/link";

/**
 * 未認証時に表示する案内。
 *
 * ログイン画面は独立したページではなく `/` の LoginModal で提供しているため、リンク先は `/`。
 * (NextAuth の pages.signIn も `/` を指している。src/lib/auth.ts 参照)
 */
export function AuthRequiredNotice() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ログインが必要です</h1>
        <Link
          href="/"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          ログイン
        </Link>
      </div>
    </div>
  );
}

/**
 * バックエンド呼び出しに失敗したときに表示する案内。
 *
 * ログイン済みなので「ログインが必要です」を出してはいけない。再読み込みを促す。
 * @param retryHref 再読み込み先（通常は表示中のページのパス）
 */
export function DataFetchErrorNotice({ retryHref }: { retryHref: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">データの取得に失敗しました</h1>
        <p className="text-gray-600 mb-6">
          一時的な問題が発生している可能性があります。<br />
          しばらく待ってから再度お試しください。
        </p>
        <a
          href={retryHref}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          再読み込み
        </a>
      </div>
    </div>
  );
}
