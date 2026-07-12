# Project instructions

## Deployment model

- This repository is a native Next.js App Router application for Vercel.
- The portfolio root route is `app/page.tsx`; the document shell is `app/layout.tsx`.
- Vercel project: `gajan-dev`, connected to GitHub repository `trikto/portfolio` on `main`.
- Vercel settings: Framework preset `Next.js`, build command `npm run build`, output directory unset, Node.js `22.x`.
- Do not restore the ChatGPT Sites/Cloudflare vinext model, including Vite, Wrangler, Cloudflare bindings, `.openai/hosting.json`, virtual modules, or the custom `sites()` plugin.

## Local verification

- Install: `npm install`
- Development: `npm run dev`
- Production build: `npm run build`
- Production server: `npm run start`
- Lint: `npm run lint`

## Migration record

- Replaced vinext scripts with native `next dev`, `next build`, and `next start`.
- Added `next.config.mjs` and removed the Vite/Cloudflare/Sites build wrapper.
- Removed unused D1, R2, Wrangler, worker, Drizzle example, Sites preview, and vinext test scaffolding.
- Preserved the portfolio content, styling, responsive behavior, animations, and App Router UI.
- Migration was validated locally and was not deployed or pushed as part of the migration.

## Product note

- The Observability dashboard is a client-side simulator with seeded local data; it must not fetch Grafana or Prometheus data.
