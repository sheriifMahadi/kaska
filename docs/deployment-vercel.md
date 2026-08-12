# Vercel + QStash testnet deployment

Kaska's testnet deployment uses one Vercel project for the Next.js application
and its bounded worker endpoints, QStash for delivery and retries, and the
existing Supabase PostgreSQL database. No permanent worker process is deployed.

## Database connection

Use Supabase's transaction-mode pooler connection string (normally port 6543),
not the direct database host. Set `DATABASE_POOL_MAX=1`. Prepared statements are
disabled in the application because transaction pooling does not preserve a
dedicated PostgreSQL session between requests.

Database migrations are an explicit release step. They must not run during
`next build`, because parallel or preview builds could attempt the same schema
change. Run `npm run db:migrate` once against the intended Supabase project,
then run `npm run seed:agents` when catalog data needs updating.

## Vercel variables

Add every variable in `.env.example` except the local/container worker settings.
Secrets must never use the `NEXT_PUBLIC_` prefix. `APP_URL` must be the canonical
production HTTPS URL; preview deployments may use Vercel's automatically
provided URL for worker destination construction, but should not receive live
Clerk webhooks or production QStash schedules.

The four internal worker routes use the Node.js runtime. Task, payment, and
wallet invocations have a 240-second limit; scheduler invocations have a
60-second limit. Each invocation claims a bounded amount of work and delegates
continuation through QStash before it ends.

## After the first deployment

1. Set `APP_URL` to the stable Vercel production URL and redeploy.
2. Run `npm run setup:qstash` with the production environment values. This
   creates the task queue plus the shared recurring-job and wallet
   reconciliation schedules.
3. Point the Clerk webhook at `<APP_URL>/api/clerk/webhook`.
4. Confirm `<APP_URL>/api/health` returns `ready`.
5. Perform the testnet end-to-end checklist before inviting testers.

The Docker files and continuous worker commands remain available as an escape
hatch for a future container deployment, but they are not part of this Vercel
architecture.
