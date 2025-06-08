###############################################################################
# A) Use Node 18 (Alpine) as a single‐stage build image
###############################################################################
FROM node:18-alpine

# Set working directory
WORKDIR /app

# ─────────────────────────────────────────────────────────────────────────────
# 1) Enable Corepack & install dependencies
# ─────────────────────────────────────────────────────────────────────────────
# Turn on Corepack so that "packageManager": "yarn@4.8.1" is honored
RUN corepack enable

# Copy exactly the files you need for install
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Activate Yarn 4.8.1 and install all dependencies
RUN corepack prepare yarn@4.8.1 --activate \
 && yarn install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# 2) Copy source code & build for production
# ─────────────────────────────────────────────────────────────────────────────
# Now that node_modules is in place, copy the rest of your app
COPY . .

# Set environment variables for a production build
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Run Next.js build
RUN yarn build

# ─────────────────────────────────────────────────────────────────────────────
# 3) Create a non-root user and prepare .next folder
# ─────────────────────────────────────────────────────────────────────────────
# Create “nextjs” group & user with UID 1001, GID 1001
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy static assets for standalone mode
RUN cp -r .next/static .next/standalone/.next/ \
 && if [ -d "public" ]; then cp -r public .next/standalone/; fi

# Set ownership of the .next folder (created by yarn build)
RUN chown -R nextjs:nodejs .next

# ─────────────────────────────────────────────────────────────────────────────
# 4) Expose port & switch to non-root, then run the standalone server
# ─────────────────────────────────────────────────────────────────────────────
# Because Next’s standalone mode outputs a server.js at /.next/standalone
# (and static assets under .next/static), we can simply run that.
USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["node", ".next/standalone/server.js"]
