import DashboardClient from "@/components/DashboardClient";
import { AuthRequiredNotice, DataFetchErrorNotice } from "@/components/PageNotice";
import { generateProjectUrlByType } from "@/lib/dashboard-config";
import { AuthRequiredError, requireAuth } from "@/lib/api-helpers";
import { backendGetJson } from "@/lib/backend";

interface Project {
  id: string;
  created_at: Date;
  expires_at: Date;
  user_id: string;
  slug: string;
  type: string;
  name?: string | null;
  url: string; // プロジェクトのURL（messageの場合はgenerateProjectUrl）
  projectMessage?: {
    message: string;
  } | null;
  projectPicture?: {
    s3_key: string;
  } | null;
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string | null;
  left_projects: number;
  plan: string;
}

// バックエンド(GET /api/projects)のレスポンス。日付はISO文字列で返ってくる
type RawProject = Omit<Project, "url" | "created_at" | "expires_at"> & {
  created_at: string;
  expires_at: string;
};

// バックエンド(GET /api/account/quota)のレスポンス
interface Quota {
  plan: string;
  left_projects: number;
}

export default async function DashboardPage() {
  try {
    const { session, userId } = await requireAuth();

    // プロジェクトと残機・プランを並列で取得（どちらもSpring Bootが提供）
    const [quota, rawProjects] = await Promise.all([
      backendGetJson<Quota>("/api/account/quota", userId),
      backendGetJson<RawProject[]>("/api/projects", userId),
    ]);

    // プロジェクトタイプに応じてURLを生成（設定ベースのアプローチ）
    const userProjects: Project[] = rawProjects.map((project) => {
      const withDates = {
        ...project,
        created_at: new Date(project.created_at),
        expires_at: new Date(project.expires_at),
      };
      const url = generateProjectUrlByType(withDates);

      return {
        ...withDates,
        url,
      };
    });

    // ユーザー情報を整理（名前・メールはセッション、残機・プランはバックエンドから）
    const userInfo: UserInfo = {
      id: userId,
      name: session.user?.name ?? null,
      email: session.user?.email ?? null,
      left_projects: quota.left_projects,
      plan: quota.plan,
    };

    return (
      <DashboardClient 
        user={userInfo}
        userProjects={userProjects}
      />
    );
  } catch (error) {
    // 未認証とバックエンド障害を区別する。まとめて扱うと、ログイン済みなのに
    // バックエンドが落ちているだけのユーザーに「ログインが必要です」を見せてしまう
    if (error instanceof AuthRequiredError) {
      return <AuthRequiredNotice />;
    }

    console.error('ダッシュボードの表示に失敗しました:', error);
    return <DataFetchErrorNotice retryHref="/dashboard" />;
  }
}
