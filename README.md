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
```

Vercel should use the Next.js framework preset, `npm run build` as the build
command, no output directory, and Node.js 22.x.

The application is rendered from the App Router root route at `app/page.tsx`.
It uses standard Next.js, React, and Tailwind CSS tooling. It does not depend
on Vite, vinext, Wrangler, Cloudflare bindings, Sites hosting metadata, or
virtual modules.
