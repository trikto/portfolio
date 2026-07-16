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

- Added server-rendered Medium article previews to the homepage and `/blog` on 2026-07-16; fetch `https://trikto.medium.com/feed` through `lib/medium.ts` with one-hour revalidation and use only verified real entries in the local fallback.
- Article cards share `/blog/<medium-slug>` URLs that permanently redirect to `https://trikto.medium.com/<medium-slug>`; keep Medium as the canonical full-article host and do not add rendered local article pages.
- Reuse the shared article grid/card components and shared site footer for future article UI changes; preserve fixed image aspect ratios, local image fallback, newest-first sorting, and the three-card homepage limit.
- The complete Medium metadata catalog is persisted in `data/articles.json`, initially backfilled from the 18-post Medium export; do not commit the raw export or full article HTML.
- `.github/workflows/sync-medium-articles.yml` merges the latest RSS entries into the catalog every six hours and on manual dispatch; preserve old catalog entries when they leave RSS, commit only real changes, and keep the runtime one-hour RSS merge for quicker display.

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
- Identified the browser search-result icon as the site favicon (also called the site icon) on 2026-07-14.
- Confirmed the favicon is declared in `app/layout.tsx` and served from `public/favicon.svg`; a generic globe in Google results indicates Google’s favicon cache/index has not refreshed, not a missing local declaration, on 2026-07-14.
- Confirmed the old Google Search description is absent from the current homepage source; refresh it through Search Console URL Inspection and Request indexing, with Removals as the temporary option, on 2026-07-14.
- Verified Google Search now shows the current title and DevOps portfolio description; the generic globe favicon is still pending Google’s favicon refresh, on 2026-07-14.
- Documented the homepage search title and description source in `app/layout.tsx:11`, resolved through the shared `pageMetadata` helper in `lib/site.ts:9-10`, on 2026-07-14.
- Verified favicon crawling is not blocked by `robots.ts`; `/` and `/favicon.svg` are publicly allowed, so the remaining Google globe is an independent favicon cache/processing delay, on 2026-07-14.
- Clarified that this portfolio uses Next.js as the framework and React as its UI library/runtime; they are complementary rather than alternatives, on 2026-07-14.
- Replaced the four Cron UI em dashes with the requested hyphen/comma wording on 2026-07-14.
- Confirmed Next.js is a React framework, so this project’s Next.js application necessarily uses React, on 2026-07-14.
