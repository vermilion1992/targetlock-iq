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

Railway detects Node from `package.json` (`engines.node`: `>=20`) and runs the standalone Next.js server. No environment variables are required for v1.

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

Then verify in a browser:

- `http://localhost:3000/` → redirects to `/targetlock`
- TargetLock UI loads with styles
- Static asset example: `http://localhost:3000/templates/hub-iq-planned-example.csv`

## v1 scope (explicitly out of scope)

- User login / authentication
- PostgreSQL or any shared cloud database
- Cross-user project sync

Add shared cloud projects in v2 after workflow, wording, math confidence, reports, scenario lab, and validation feedback.

## References

- [Railway Next.js guide](https://docs.railway.com/guides/nextjs)
- [Railway monorepo guide](https://docs.railway.com/guides/monorepo)
