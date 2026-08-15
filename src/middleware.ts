// middleware.ts

import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// デバッグログの制御用
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugMode = process.env.DEBUG_MIDDLEWARE === 'true';

// デバッグログ出力用のヘルパー関数
const debugLog = (message: string, ...args: any[]) => {
    if (isDevelopment || isDebugMode) {
        console.log(`[Middleware Debug] ${message}`, ...args);
    }
};

// NextAuth v5（beta）

export async function middleware(req: NextRequest) {
    try {
        debugLog('Middleware processing request:', req.url);

        // auth() は Prismaアダプターごとバンドルされ vercel の "middleware1MB規制" に引っかかるため、
        // DBアクセスを伴わない getToken() でセッションCookieの検証のみを行う
        // secureCookie を明示しないと、本番(https)のCookie名 __Secure-authjs.session-token を探せず
        // 常に未ログイン扱いになるため注意
        // secret は src/lib/auth.ts の設定と必ず一致させること
        // (auth.ts が secret: process.env.NEXTAUTH_SECRET を明示指定しているため、
        //  AUTH_SECRET を渡すと復号に失敗し全ユーザーが未ログイン扱いになる)
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === 'production',
        });

        if (!token) {
            debugLog('No valid session found, redirecting to home');
            return NextResponse.redirect(new URL("/", req.url));
        }

        debugLog('Valid session found, proceeding to dashboard');
        return NextResponse.next();
    } catch (error) {
        // エラーログは本番環境でも出力する（重要なエラー情報のため）
        console.error('Middleware error:', error);
        
        return NextResponse.redirect(new URL("/", req.url));
    }
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/create/:path*",
        "/account/:path*"
    ],
};
