# Gajan Portfolio

Native Next.js portfolio application for Vercel.

## Requirements

- Node.js 22.x
- npm

## Commands

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test:blog
```

Vercel should use the Next.js framework preset, `npm run build` as the build
command, no output directory, and Node.js 22.x.

The application is rendered from the App Router root route at `app/page.tsx`.
It uses standard Next.js, React, and Tailwind CSS tooling. It does not depend
on Vite, vinext, Wrangler, Cloudflare bindings, Sites hosting metadata, or
virtual modules.

## Local MDX blog

Published articles live in `content/blog/` and are rendered locally at
`/blog/<slug>`. The original identifier-bearing Medium slugs are preserved,
but `https://gajan.dev` is canonical. Medium is an optional secondary link,
not a runtime content source. `data/articles.json` remains only as the
verified 13-article migration manifest.

Use this GitHub-first workflow for new or updated articles:

1. Copy `content/blog/_template.mdx` to a descriptive, lowercase slug.
2. Fill every required frontmatter field and keep `draft: true` while editing.
3. Write the article body as MDX and place images under
   `public/blog/<slug>/`.
4. Reference local images with `/blog/<slug>/<file>` paths.
5. Run `npm run test:blog`, `npm run lint`, `npm run typecheck`, and
   `npm run build`.
6. Set `draft: false`, review the local article route, and publish the GitHub
   change.
7. Optionally cross-post to Medium and add its URL to `mediumUrl`; keep
   `gajan.dev` as the canonical version.

The one-time/recovery importer supports the existing manifest:

```bash
npm run import:medium
npm run import:medium -- --overwrite
npm run import:medium -- --export <medium-export.zip-or-directory>
```

The default import skips existing MDX files. `--overwrite` replaces migrated
articles and only their generated image files. Supplying `--export` adds a
Medium export ZIP or extracted directory as the final source fallback.
