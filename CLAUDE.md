# CLAUDE.md — Invoice PDF Generator

## Project Overview

Full-stack invoice management app for creating, managing, and downloading professional PDF invoices. Built with Next.js 14 (App Router), PostgreSQL, Drizzle ORM, and deployed via Docker/Coolify.

## Tech Stack

- **Framework:** Next.js 14 (App Router, React Server Components)
- **Language:** TypeScript 5.3 (strict mode)
- **Database:** PostgreSQL 15 + Drizzle ORM
- **Auth:** NextAuth 4.24 (credentials provider, JWT sessions)
- **Styling:** Tailwind CSS 3.4
- **PDF:** @react-pdf/renderer 3.1
- **Forms:** React Hook Form + Zod validation
- **Testing:** Jest 30 + Testing Library + MSW 2.10 + Supertest
- **Package Manager:** Yarn 4.8.1 (PnP)

## Commands

```bash
# Development
yarn dev                 # Start dev server (port 3000)
yarn build               # Production build
yarn start               # Start production server

# Testing
yarn test                # Run all tests
yarn test:watch          # Watch mode
yarn test:coverage       # With coverage report
yarn test:ci             # CI mode

# Linting & Types
yarn lint                # ESLint
yarn lint:fix            # Auto-fix lint errors
yarn type-check          # TypeScript checking

# Database
yarn db:generate         # Generate Drizzle migrations
yarn db:push             # Apply migrations
yarn db:studio           # Open Drizzle Studio
```

## Project Structure

```
app/                     # Next.js App Router
  api/                   # API routes (auth, business-profiles, clients, invoices, templates, dashboard, health)
  dashboard/             # App pages (invoices, clients, business-profiles, templates)
  login/                 # Auth page
lib/
  db/                    # Database (schema/, migrations/, db-client.ts)
  pdf/                   # PDF generation utilities
  auth.ts                # NextAuth config
  utils/                 # Helpers
components/              # React components
__tests__/               # Jest test suite (app/api, lib, utils)
types/                   # TypeScript types
docker/                  # Docker init scripts (init-db.sql)
drizzle/                 # ORM migrations
```

## Key Architecture Decisions

- **Standalone output** in next.config.js for Docker deployment
- **Drizzle ORM** over Prisma for lighter weight and type safety
- **Server-side auth** via middleware.ts — public routes: `/login`, `/api/auth/*`, `/api/health`
- **Path alias:** `@/*` maps to project root
- **Database schema** split into `auth-schema.ts` and `invoice-schema.ts`

## Database

8 core tables: `users`, `sessions`, `verification_tokens`, `business_profiles`, `clients`, `invoices`, `invoice_items`, `invoice_templates` + `invoice_template_items`.

Connection via `DATABASE_URL` env var. Default dev: `postgresql://postgres:postgres@localhost:5432/invoice_db`.

## Environment Variables

See `.env.example`. Key vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`.

## Deployment

- **Platform:** Coolify (auto-deploy on push to main/dev)
- **Config:** `docker-compose.prod.yml`
- **Docker:** Multi-stage build (deps → builder → runner), Node 18-Alpine, non-root user
- **Health check:** `GET /api/health`

## CI/CD (.github/workflows/ci.yml)

Triggered on push/PR to main or dev. Jobs: lint, test (with Postgres service), build, security audit, Docker build, coverage report.

## Coding Conventions

- Use TypeScript strict mode; no `any` unless unavoidable
- API routes return `NextResponse.json()` with appropriate status codes
- Validate inputs with Zod schemas
- Use Drizzle query builder (not raw SQL)
- Follow existing patterns in `app/api/` for new endpoints
- Test files go in `__tests__/` mirroring source structure

## Short History

The project evolved through several phases:

1. **Initial setup** — Next.js 14 scaffold with Dockerfile iterations (multiple CI and Docker fixes)
2. **Core features** — Auth (NextAuth + password wall), database migrations, invoice CRUD
3. **Invoice templates** — Reusable invoice templates with template items (several iterations of fixes)
4. **Testing** — Jest test suite with MSW mocking, Testing Library, Supertest
5. **Deployment** — Docker Compose for prod (Coolify), health checks, database persistence
6. **Polish** — Logout URL fix, database connection fixes, cleanup
