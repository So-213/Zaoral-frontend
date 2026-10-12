// lib/auth.ts

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import LINE from "next-auth/providers/line"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import { initializeUserQuota } from "./backend"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma), //認証時のDB保存　//providerが違ってもidが一意になるようにする
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    LINE({
      clientId: process.env.AUTH_LINE_ID,
      clientSecret: process.env.AUTH_LINE_SECRET,
      issuer: 'https://access.line.me',
      checks: ['pkce', 'state'],
      allowDangerousEmailAccountLinking: true,
    }),
    // テストユーザープロバイダー
    {
      id: "test",
      name: "テストユーザー",
      type: "credentials",
      credentials: {},
      async authorize() {
        // DBから既存のテストユーザーを取得、存在しない場合は作成
        const testEmail = "test-1765733282609@example.com";
        let user = await prisma.user.findUnique({
          where: { email: testEmail },
        });

        if (!user) {
          // テストユーザーが存在しない場合は作成
          user = await prisma.user.create({
            data: {
              email: testEmail,
              name: "テストユーザ",
              emailVerified: new Date(),
            },
          });
          // PrismaAdapterを通らないため events.createUser が発火しない。quota初期化を明示的に呼ぶ
          await initializeUserQuota(user.id);
        }

        // DBに存在する実際のユーザーIDを返す
        return {
          id: user.id,
          name: user.name || "テストユーザ",
          email: user.email || testEmail,
          image: user.image,
        };
      }
    }
  ],
  session: { strategy: "jwt" },// jwtから情報を取得してくるようにする設定
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // 開発環境でのデバッグを有効化
  cookies: {
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  events: {
    // 新規ユーザー作成時に1度だけ発火する。業務データ(user_quota)の初期化をSpring Bootへ依頼する。
    // events はイベントであり、失敗してもユーザー作成はロールバックされない(initializeUserQuota は例外を投げない)。
    async createUser({ user }) {
      if (user.id) {
        await initializeUserQuota(user.id);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {//userはプロバイダーから取得したユーザー情報
      if (user) {
        token.userId = user.id;// User.idとJWTを紐付けるために、userIdをJWTの方に渡す
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    }
  },
  experimental: {
    enableWebAuthn: false,
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  }
})




