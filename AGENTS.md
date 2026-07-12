# Project notes

- Vercel project `gajan-dev` is connected to GitHub repository `trikto/gajan.dev` on `main`.
- The local checkout currently has a ChatGPT-hosted `origin` remote, so it is not the same GitHub checkout.
- On 2026-07-12, renaming `trikto/gajan.dev` to `portfolio` was rejected because `trikto/portfolio` already exists; the current local `main` was force-pushed to that existing `trikto/portfolio` repo instead.
- The Observability dashboard is a client-side simulator with seeded local data; it must not fetch Grafana or Prometheus data.
- Vercel project `gajan-dev` was reconnected to GitHub repository `trikto/portfolio` on 2026-07-12.
- Deleting `trikto/gajan.dev` remains pending because the active GitHub CLI token still lacks the `delete_repo` scope.
