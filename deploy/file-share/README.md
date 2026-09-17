# Encrypted file-share API (Contabo K3s)

Go API that stores **opaque ciphertext** on a volume-mounted path. The browser
encrypts the file with AES-GCM and keeps the key in the URL fragment. Public
access is **Cloudflare-proxied DNS → Traefik**, not Cloudflare Tunnel.

| Item | Value |
|------|-------|
| Host | `api.gajan.dev` |
| Public paths | `/api/v1/files` (Prefix) only |
| Not public | `/healthz`, `/readyz`, `/metrics` |
| Image | `ghcr.io/trikto/portfolio/file-share` |
| Namespace | `files` |
| Store | PVC `file-share-data` mounted at `/data` (`local-path`, 20Gi, RWO) |
| Replicas | **1** (Recreate). RWO local-path cannot be shared across nodes. |
| Max ciphertext | 104858014 bytes (100 MiB file plus AES-GCM envelope) |

CI builds and pushes the image. It does **not** deploy. Apply this package on
the cluster after GHCR has `file-share:latest`.

## Deploy steps

### 1. DNS and Traefik

Already required for one-time secrets:

- Traefik listens on **80/443** on the Contabo VPS
- Cloudflare DNS: `api.gajan.dev` **A/AAAA** → Contabo public IP, **proxied**
- TLS: cert-manager ClusterIssuer `letsencrypt-dns` (see [`deploy/cert-manager/README.md`](../cert-manager/README.md))

This package issues a second Certificate in the `files` namespace so Ingress
can use `secretName: gajan-dev-tls` there. Wait until that Certificate is
Ready before expecting HTTPS on the new path.

If the UI shows a browser CORS error with status null, check the API from
curl first. Cloudflare `502` on `/api/v1/files` while `/api/v1/secrets`
succeeds usually means Traefik cannot reach the pod (NetworkPolicy), not a
frontend bug.

### 2. K3s local-path storage

The PVC uses StorageClass `local-path` (Rancher local-path-provisioner, included
with K3s). Confirm it exists:

```bash
kubectl get storageclass local-path
```

If you prefer a specific host directory instead of the provisioner's default
(`/var/lib/rancher/k3s/storage/...`), replace `pvc.yaml` with a `hostPath`
volume and pin the pod to that node with a `nodeSelector` / `nodeName`.

### 3. Apply this package

From the repository root (after `git pull` on a machine with cluster access):

```bash
kubectl apply -k deploy/file-share
kubectl -n files rollout status deploy/file-share
```

Pull the image on Contabo after CI publishes (the cluster has no inbound from
GitHub Actions). If the GHCR package is public:

```bash
kubectl -n files rollout restart deploy/file-share
kubectl -n files rollout status deploy/file-share
```

If the package is private, create a pull secret once:

```bash
kubectl -n files create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USER \
  --docker-password=YOUR_GITHUB_PAT

kubectl -n files patch deploy file-share -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-pull"}]}}}}'
kubectl -n files rollout restart deploy/file-share
```

### 4. Verify

```bash
kubectl -n files get pods,svc,ingress,pvc,certificate
kubectl -n files get secret gajan-dev-tls
kubectl -n files get servicemonitor,prometheusrule -l release=kps
kubectl -n files describe pod -l app.kubernetes.io/name=file-share
```

The PVC should be Bound. The pod should be Ready. The Ingress path
`/api/v1/files` should exist on `api.gajan.dev` alongside `/api/v1/secrets`.

### 5. Smoke test (create → fetch → fetch again → GET rejected)

```bash
# Create (opaque bytes; the API never sees a filename or key)
printf 'ciphertext-demo' > /tmp/demo.bin
curl -sS -D - -o /tmp/create.json -X POST https://api.gajan.dev/api/v1/files \
  -H 'content-type: application/octet-stream' \
  -H 'origin: https://gajan.dev' \
  --data-binary @/tmp/demo.bin
# Expect HTTP 201 and {"id":"..."}

ID=$(python -c "import json; print(json.load(open('/tmp/create.json'))['id'])")

# Fetch — expect 200 and the same bytes. Does not delete the record.
curl -sS -o /tmp/fetched.bin -w '%{http_code}\n' \
  -X POST "https://api.gajan.dev/api/v1/files/${ID}" \
  -H 'origin: https://gajan.dev'
cmp /tmp/demo.bin /tmp/fetched.bin

# Second fetch — still 200
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST "https://api.gajan.dev/api/v1/files/${ID}" \
  -H 'origin: https://gajan.dev'

# GET must not retrieve (avoids link unfurlers pulling 100 MB)
curl -sS -o /dev/null -w '%{http_code}\n' \
  "https://api.gajan.dev/api/v1/files/${ID}"   # expect 405
```

Health and metrics stay off the public Ingress:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.gajan.dev/healthz   # expect 404
curl -sS -o /dev/null -w '%{http_code}\n' https://api.gajan.dev/metrics  # expect 404
```

Browser check: open `https://gajan.dev/files`, encrypt a small file, copy the
link including `#`, open it, click **Download file**.

## API contract

| Method | Path | Body | Success |
|--------|------|------|---------|
| POST | `/api/v1/files` | raw ciphertext (`application/octet-stream`) | `201 {"id"}` |
| POST | `/api/v1/files/{id}` | empty | `200` ciphertext |
| GET | `/api/v1/files/{id}` | — | `405` |
| OPTIONS | both paths | — | `204` CORS |

Errors use `{ "error": "<code>", "message": "..." }` with codes
`invalid_request`, `payload_too_large`, `rate_limited`, `store_unavailable`,
`not_found`. CORS allows `https://gajan.dev` only. Credentials are never
enabled.

Create and fetch are both **POST** so mail scanners and chat unfurlers that
only GET the URL do not pull ciphertext (or a 100 MB object). The stored copy
is **not** deleted on fetch.

## Known pitfalls

| Symptom | Likely cause |
|---------|----------------|
| PVC Pending | `local-path` StorageClass missing, or no disk on the node |
| Pod CrashLoop / NotReady | Volume not writable by uid 65532; check `fsGroup: 65532` |
| ImagePullBackOff | GHCR package still private, or `latest` not published yet |
| Cloudflare 413 / failed large upload | Free Cloudflare proxy caps uploads at 100 MB. A 100 MB file plus GCM overhead can exceed that. Grey-cloud `api.gajan.dev` or raise the Cloudflare plan if you need the full limit. |
| ServiceMonitor never scraped | Missing `release: kps` |
| Browser CORS errors | `ALLOWED_ORIGINS` must include `https://gajan.dev` exactly |
| Browser CORS with null status / Cloudflare 502 on `/api/v1/files` | NetworkPolicy `from.podSelector` must match Traefik only (`app.kubernetes.io/name: traefik`). Re-apply this package after the kustomize selector fix. |
| Two pods, missing files | Do not scale above 1 replica while the volume is RWO |

## Security notes

- The API stores ciphertext only. It never receives the fragment key or the
  plaintext filename.
- Operators with node or PVC access can see ciphertext size, ids, and mtimes.
- There is no TTL yet. Files remain until you delete objects under `/data`.
- Rate limit is per-pod in memory (20 creates and 20 fetches per IP per hour).
  A restart resets counters.
