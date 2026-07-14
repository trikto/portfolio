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
- Migration was validated locally and deployed to Vercel on 2026-07-12.
- The Vercel project was set to the Next.js preset with `npm run build`, the default Next.js output directory, and Node.js 22.x; `https://gajan.dev` returned HTTP 200 after the fresh production deployment.
- The hero headline rotates `reliable`, `observable`, `resilient`, and `repeatable` after the static text `Systems made`; preserve the typewriter cursor and reduced-motion behavior when editing it.
- The navbar includes LinkedIn, GitHub, and Contact actions; the back-to-top control is revealed by navbar visibility and returns to `#site-top` so the navbar is visible.
- The favicon uses the same green service dot as the infrastructure topology diagram.

## Product note

- The Observability dashboard is a client-side simulator with seeded local data; it must not fetch Grafana or Prometheus data.

## Recent changes

- Removed the redundant footer navigation links on 2026-07-12; retain only the copyright-area Workout Schedule link.
- Added a discreet footer link and minimal `/workouts` schedule page on 2026-07-12; keep workout content secondary to the DevOps portfolio and out of primary navigation.
- Added the `/tools` directory and placeholder routes for planned browser-based DevOps utilities on 2026-07-12.
- Added native Next.js sitemap, robots, llms.txt, centralized canonical metadata, and non-indexable redirects for legacy tool URLs on 2026-07-12.
- Updated the header GitHub button to link to the `trikto` profile on 2026-07-12.
- Corrected the topology diagram label from `ci` to `CI` on 2026-07-12.
- Migrated browser tool SEO routes to `/cron` and `/yaml`, with permanent legacy redirects, on 2026-07-13.
- Replaced the `/cron` placeholder with a browser-only five-field Linux cron editor, validator, explainer, and timezone-aware run preview on 2026-07-13; preserve its client-side-only behavior and shared portfolio visual language.
- Confirmed the current stack on 2026-07-14: Next.js App Router, React, TypeScript, Tailwind CSS v4, and Vercel; no database or backend runtime is used by the portfolio.
- Changed GitHub repository visibility to private on 2026-07-14.
- CodeRabbit CLI review could not run locally on 2026-07-14 because its installer does not support Git Bash on Windows; use a supported shell/OS for CodeRabbit reviews.
- Replaced the `/cron` minute-by-minute preview scan with Croner and a 250 ms client-side debounce on 2026-07-14; preserve immediate validation and the explicit updating-preview state.
