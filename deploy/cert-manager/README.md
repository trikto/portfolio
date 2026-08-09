# cert-manager + Let's Encrypt (Cloudflare DNS-01)

TLS for Contabo-hosted Traefik, with Cloudflare proxy in front. Public hostnames
such as `api.gajan.dev` and `contabo.gajan.dev` terminate TLS at Traefik using a
wildcard Let's Encrypt certificate. Cloudflare SSL/TLS mode should be
**Full (strict)** only after that origin cert is live.

## Why DNS-01

HTTP-01 has to serve `/.well-known/acme-challenge` through the Cloudflare proxy
to the origin. Proxy settings, redirects, and SSL mode all interfere. DNS-01
writes a TXT record via the Cloudflare API, so it is indifferent to how traffic
reaches Traefik, and it can issue `*.gajan.dev`.

## Prerequisites

- Helm 3 and cluster-admin on the Contabo K3s node
- A Cloudflare API token (created below) — never commit it
- Traefik listening on ports 80/443 on the VPS

## 1. Install cert-manager (if absent)

```bash
kubectl get pods -n cert-manager

helm repo add jetstack https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait
```

## 2. Create a scoped Cloudflare API token

In Cloudflare Dashboard → My Profile → API Tokens → Create Token:

- Permissions: **Zone → DNS → Edit**
- Zone Resources: **Include → Specific zone → `gajan.dev`**
- No account-level or other-zone access

Copy the token once. Do not paste it into git, chat, or a committed file.

## 3. Store the token in the cluster

```bash
kubectl create secret generic cloudflare-api-token \
  -n cert-manager \
  --from-literal=api-token='PASTE_TOKEN_HERE'
```

Rotate by deleting and recreating the secret, then restarting cert-manager if
challenges stall:

```bash
kubectl -n cert-manager rollout restart deploy/cert-manager
```

## 4. Apply ClusterIssuer + Certificate

The Certificate targets namespace `secrets`. The kustomization includes that
Namespace object, so this can run before or after the API package:

```bash
kubectl apply -k deploy/cert-manager
```

Resources:

| File | Purpose |
|------|---------|
| `clusterissuer.yaml` | ACME issuer `letsencrypt-dns` using Cloudflare DNS-01 |
| `certificate.yaml` | Issues `*.gajan.dev` + `gajan.dev` → Secret `gajan-dev-tls` in `secrets` |

## 5. Verify Certificate Ready

```bash
kubectl get clusterissuer letsencrypt-dns
kubectl -n secrets get certificate gajan-dev-wildcard
kubectl -n secrets describe certificate gajan-dev-wildcard
kubectl -n secrets get secret gajan-dev-tls
```

`Ready` must be `True` and the secret must contain `tls.crt` / `tls.key`.
If stuck, inspect challenges:

```bash
kubectl -n secrets get challenges,orders
kubectl -n cert-manager logs deploy/cert-manager --tail=100
```

## 6. Confirm Traefik serves the LE cert

With the Ingress applied (`deploy/onetime-secret`), hit the origin through
Cloudflare (still in Flexible or Full is fine during bootstrap):

```bash
curl -vI https://api.gajan.dev 2>&1 | grep -Ei 'subject:|issuer:|expire'
```

You want an issuer containing `Let's Encrypt`, not a Cloudflare edge-only
origin cert story. From the VPS itself you can also talk to Traefik directly:

```bash
curl -vkI --resolve api.gajan.dev:443:127.0.0.1 https://api.gajan.dev
```

## 7. Switch Cloudflare to Full (strict)

**Order matters.** Full (strict) without a valid origin certificate breaks every
proxied hostname on the zone (including Grafana at `contabo.gajan.dev`).

1. Certificate `Ready=True`
2. Traefik presents the LE cert on 443
3. Cloudflare Dashboard → SSL/TLS → Overview → **Full (strict)**

## Placeholders

- `clusterissuer.yaml` email is `work@gajan.dev` — change if you use another ACME contact.
- No API tokens or private keys belong in this directory.
