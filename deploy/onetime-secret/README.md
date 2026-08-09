# One-time secret API (Contabo K3s)

Go API + memory-only Valkey on the Contabo VPS. Public access is
**Cloudflare-proxied DNS → Traefik**, not Cloudflare Tunnel.

| Item | Value |
|------|-------|
| Host | `api.gajan.dev` |
| Public paths | `/api/v1/secrets` (Prefix) only |
| Not public | `/healthz`, `/readyz`, `/metrics` |
| Image | `ghcr.io/trikto/portfolio/onetime-secret` |
| Namespace | `secrets` |

## Deploy steps

### 1. DNS and Traefik

- Traefik must listen on **80/443** on the Contabo VPS (K3s default ServiceLB / host ports).
- Cloudflare DNS: `api.gajan.dev` **A/AAAA** → Contabo public IP, **proxied** (orange cloud).
- Same pattern as Grafana at `contabo.gajan.dev`.

### 2. TLS (cert-manager)

Follow [`deploy/cert-manager/README.md`](../cert-manager/README.md):

1. Install cert-manager if needed
2. Create `cloudflare-api-token` secret (never commit the token)
3. Apply ClusterIssuer + wildcard Certificate
4. Wait until Certificate is Ready and Traefik serves the LE cert
5. Only then set Cloudflare SSL/TLS to **Full (strict)**

### 3. Apply this package

```bash
kubectl apply -k deploy/onetime-secret
```

Pull the image on Contabo after CI publishes (the cluster has no inbound from
GitHub Actions). The GitHub repository is public; if the GHCR package is also
public, Contabo can pull without credentials:

```bash
kubectl -n secrets rollout restart deploy/onetime-secret
kubectl -n secrets rollout status deploy/onetime-secret
```

If the package is private (GHCR can still default new packages that way), create
a pull secret once and patch the Deployment:

```bash
kubectl -n secrets create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USER \
  --docker-password=YOUR_GITHUB_PAT

kubectl -n secrets patch deploy onetime-secret -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-pull"}]}}}}'
kubectl -n secrets rollout restart deploy/onetime-secret
```

### 4. Verify

```bash
kubectl -n secrets get pods,svc,ingress,pdb
kubectl -n secrets get certificate,secret gajan-dev-tls
kubectl -n secrets get servicemonitor,prometheusrule -l release=kps
kubectl -n monitoring get configmap onetime-secret-dashboard --show-labels
```

Prometheus targets (Grafana Explore or Prometheus UI) should show the
`onetime-secret` metrics endpoint up. The Grafana sidecar loads the dashboard
ConfigMap labelled `grafana_dashboard: "1"`.

### 5. Smoke test (create → burn → burn again)

```bash
# Create
curl -sS -X POST https://api.gajan.dev/api/v1/secrets \
  -H 'content-type: application/json' \
  -H 'origin: https://gajan.dev' \
  -d '{"payload":"dGVzdA","ttl":3600}'

# Burn (replace ID) — expect 200 with {"payload":"..."}
curl -sS -X POST "https://api.gajan.dev/api/v1/secrets/ID/burn" \
  -H 'origin: https://gajan.dev'

# Second burn — expect 404 not_found
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST "https://api.gajan.dev/api/v1/secrets/ID/burn"
```

Confirm health and metrics are **not** on the public Ingress:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.gajan.dev/healthz   # expect 404 from Traefik
curl -sS -o /dev/null -w '%{http_code}\n' https://api.gajan.dev/metrics  # expect 404
```

## Known pitfalls

| Symptom | Likely cause |
|---------|----------------|
| ServiceMonitor never scraped | Missing `release: kps` on the ServiceMonitor / PrometheusRule |
| Grafana dashboard missing / sidecar 401 | Sidecar cannot list ConfigMaps; check Grafana release RBAC and `grafana_dashboard: "1"` |
| Cloudflare 526 after mode change | Switched to Full (strict) before Certificate Ready |
| Creates return 503 | Valkey down, or NetworkPolicy blocking API→Valkey |
| Browser CORS errors | `ALLOWED_ORIGINS` must include `https://gajan.dev` exactly |

## Next step: Argo CD

CI builds and pushes the image; it does **not** deploy. A natural follow-up is
an Argo CD Application pointing at `deploy/onetime-secret` so Contabo pulls
manifest (and image tag) changes without inbound access from GitHub Actions.

## Security notes

- Valkey is memory-only (`--save ""`, `--appendonly no`, no PVC). Restart loses pending secrets.
- Payloads are browser-encrypted ciphertext; the API never sees plaintext or the fragment key.
- Operators with cluster access can still observe ciphertext size, timing, and ids in Valkey memory.
