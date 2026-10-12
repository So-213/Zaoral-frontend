import { Project } from "@/types/dashboard";
import { generateProjectUrl } from "@/lib/config";

/**
 * プロジェクトタイプごとの表示フィールド設定
 */
export interface ProjectTypeFieldConfig {
  label: string;
  getValue: (project: Project) => string;
}

export interface ProjectTypeDisplayConfig {
  fields: ProjectTypeFieldConfig[];
}

/**
 * プロジェクトタイプごとのURL生成関数の型
 */
export type ProjectUrlGenerator = (project: {
  type: string;
  slug: string;
  projectPicture?: { s3_key: string } | null;
  [key: string]: any;
}) => string;

/**
 * プロジェクトタイプごとのURL生成設定
 * picture型は停止中のため、S3のURL生成は持たない。再開時はバックエンドがURLをレスポンスに含めて返す
 * 新しいタイプを追加する場合は、ここにURL生成ロジックを追加するだけ
 */
export const projectTypeUrlGenerators: Record<string, ProjectUrlGenerator> = {
  message: (project) => {
    return generateProjectUrl(project.slug);
  },
};

/**
 * デフォルトのURL生成関数（タイプが未定義の場合）
 */
export const defaultUrlGenerator: ProjectUrlGenerator = (project) => {
  return generateProjectUrl(project.slug);
};

/**
 * プロジェクトのURLを生成する関数
 * プロジェクトタイプに応じて適切なURL生成ロジックを使用
 */
export function generateProjectUrlByType(project: {
  type: string;
  slug: string;
  projectPicture?: { s3_key: string } | null;
  [key: string]: any;
}): string {
  const generator = projectTypeUrlGenerators[project.type] || defaultUrlGenerator;
  return generator(project);
}

/**
 * プロジェクトタイプごとの表示設定
 * 新しいタイプを追加する場合は、ここに設定を追加するだけ
 */
export const projectTypeDisplayConfigs: Record<string, ProjectTypeDisplayConfig> = {
  picture: {
    fields: [
      {
        label: 'プロジェクト名',
        getValue: (project) => project.name || 'プロジェクト名がありません',
      },
    ],
  },
  message: {
    fields: [
      {
        label: 'プロジェクト名',
        getValue: (project) => project.name || 'プロジェクト名がありません',
      },
      {
        label: 'メッセージ',
        getValue: (project) => project.projectMessage?.message || 'メッセージがありません',
      },
    ],
  },
};

/**
 * デフォルトの表示設定（タイプが未定義の場合）
 */
export const defaultDisplayConfig: ProjectTypeDisplayConfig = {
  fields: [
    {
      label: 'プロジェクト名',
      getValue: (project) => project.name || 'プロジェクト名がありません',
    },
  ],
};
