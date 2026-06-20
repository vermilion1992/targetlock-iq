# TargetLock IQ — Railway deployment (v1 test)

Deploy the Next.js prototype from `packages/starterkit` to Railway for external tester access. This v1 deploy hosts the app only — **no login, database, or shared cloud storage**.

## Data model for testers

TargetLock stores holes and surveys in **browser `localStorage`**. Each tester’s data stays on their device/browser. Railway provides a public URL to run the app; it does **not** sync projects between users. That is intentional for this feedback phase.

## Prerequisites

1. Push this repository to GitHub.
2. Confirm local build works (see [Local pre-deploy checklist](#local-pre-deploy-checklist) below).

## Railway service settings

Create a new Railway project: **New Project → Deploy from GitHub repo** → select this repository.

In the service **Settings** tab, configure:

| Setting | Value |
|---------|--------|
| **Root directory** | `packages/starterkit` |
| **Build command** | `npm run build` |
| **Start command** | `npm run start` |

Optional — limit redeploys to TargetLock changes only:

| Setting | Value |
|---------|--------|
| **Watch paths** | `packages/starterkit/**` |

### Environment variables

In **Variables**, set (recommended for Railway networking on port 8080):

| Variable | Value | Required |
|----------|--------|----------|
| `PORT` | `8080` | Auto-injected by Railway |
| `HOSTNAME` | `0.0.0.0` | Optional (start script defaults to this) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `pk.…` Mapbox **public** token | Only for the Planner satellite map |

Railway also injects `PORT` automatically; `npm run start` runs [`scripts/start-railway.mjs`](../../packages/starterkit/scripts/start-railway.mjs), which sets the same defaults if variables are missing. Deploy logs should include a line like `[start-railway] Listening on http://0.0.0.0:8080 (standalone)` before Next.js reports ready.

> **Important — `NEXT_PUBLIC_MAPBOX_TOKEN` is read at _build time_.** Next.js inlines `NEXT_PUBLIC_*` variables into the client bundle during `npm run build`, not at runtime. The token **must exist in Railway Variables before the build runs**; adding it afterwards requires a **redeploy/rebuild** to take effect. Without it, the app still runs but the Planner satellite view stays disabled (it shows an explicit "satellite provider not configured" message, not a silent failure). Use a Mapbox **public** token (`pk.…`); it is safe to expose in the browser. Grid-only/local maps work without it.

## Generate a public URL

1. Deploy the service (Railway builds automatically after GitHub connect).
2. Go to **Settings → Networking**.
3. Click **Generate Domain**.
4. Share with testers: `https://<your-service>.up.railway.app/targetlock`

The app redirects `/` to `/targetlock` automatically.

## Local pre-deploy checklist

From `packages/starterkit`:

```powershell
cd packages/starterkit
npm run test
npm run lint
npm run build
npm run start
```

Then verify in a browser (production start defaults to port **8080**):

- `http://localhost:8080/` → redirects to `/targetlock`
- TargetLock UI loads with styles
- Static asset example: `http://localhost:8080/templates/hub-iq-planned-example.csv`

On Windows you can override the port: `$env:PORT=8080; npm run start`

## v1 scope (explicitly out of scope)

- User login / authentication
- PostgreSQL or any shared cloud database
- Cross-user project sync

Add shared cloud projects in v2 after workflow, wording, math confidence, reports, scenario lab, and validation feedback.

## References

- [Railway Next.js guide](https://docs.railway.com/guides/nextjs)
- [Railway monorepo guide](https://docs.railway.com/guides/monorepo)
