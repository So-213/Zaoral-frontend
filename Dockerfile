# Zaoral - Next.js アプリケーション用 Dockerfile
# docker buildの中身

# ベースイメージ
FROM node:22.9.0-slim AS base

# 依存関係のインストール stage
FROM base AS deps
WORKDIR /app

# package.json と lockfile をコピー
# COPYというのはOS非依存のテキストのみをプロジェクトからDockerにコピーしているという意味
COPY package.json package-lock.json ./
# postinstall の prisma generate が schema.prisma を必要とするため先にコピーする
COPY prisma ./prisma
# 依存関係をインストール（本番用）
RUN npm ci

# ビルド stage
FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ビルド時に必要な環境変数（ビルド時のみ、実行時は上書き）
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma generate & ビルド
RUN npx prisma generate
RUN npm run build

# 本番実行 stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 非rootユーザーの作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ビルド成果物をコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# アプリの起動のみ。マイグレーションは docker-compose.yml の migrate サービスが担う
# (アプリ用ロール zaoral_app にはDDL権限が無いため、ここで migrate deploy しても失敗する)
CMD ["sh", "-c", "npm run start"]
