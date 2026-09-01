# Deployment guide

Three pieces: a Postgres database, the API on AWS EC2, and the dashboard on Vercel.
Budget about 45 minutes the first time.

> **The one thing that trips people up:** Vercel serves your dashboard over HTTPS. A browser
> will refuse to let an HTTPS page call a plain `http://` API — the requests fail as mixed
> content, and the WebSocket fails too. So the API needs a domain and a certificate. Steps 3
> and 4 handle that with a free subdomain and Caddy, which fetches and renews the certificate
> on its own.

---

## Step 1 — Database (Neon, free)

1. Sign up at [neon.tech](https://neon.tech) and create a project. Pick the region closest to
   where you will run EC2 (`ap-south-1` / Mumbai if you are in India).
2. Copy the connection string from the dashboard. It looks like:
   `postgresql://user:pass@ep-xxx-123.ap-south-1.aws.neon.tech/neondb?sslmode=require`
3. Keep it somewhere safe — you need it in step 3.

Prefer AWS end to end? Create an RDS `db.t3.micro` PostgreSQL instance instead, mark it
publicly accessible, and open port 5432 in its security group to your EC2 instance only. Neon
is faster to set up and stays free.

---

## Step 2 — Launch an EC2 instance

1. EC2 console → **Launch instance**.
2. Name: `instant-mechanic-api`. AMI: **Ubuntu Server 24.04 LTS**. Type: **t2.micro** or
   **t3.micro** (free tier).
3. Create a new key pair, download the `.pem`, keep it.
4. Network settings → **Edit**, and allow:
   - SSH (22) from your IP
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
5. Launch, then copy the instance's **public IPv4 address**.

Connect:

```bash
chmod 400 ~/Downloads/your-key.pem
ssh -i ~/Downloads/your-key.pem ubuntu@<PUBLIC_IP>
```

---

## Step 3 — Install and run the API

On the EC2 box:

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Get the code
git clone https://github.com/<your-username>/instant-mechanic-ops.git
cd instant-mechanic-ops/backend
npm ci

# Configure
cp .env.example .env
nano .env
```

Set these values in `.env`:

```ini
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...your Neon string...?sslmode=require
JWT_SECRET=<paste the output of: openssl rand -base64 32>
CORS_ORIGINS=https://your-project.vercel.app
SIMULATOR_ENABLED=true
SIMULATOR_INTERVAL_MS=8000
```

You will not know the Vercel URL until step 5 — put a placeholder now and come back to fix it.

Create the schema, seed it, and build:

```bash
npm run db:push
npm run db:seed
npm run build
node dist/index.js        # check it boots, then Ctrl-C
```

Run it as a service so it survives reboots and crashes:

```bash
sudo tee /etc/systemd/system/instant-mechanic-api.service > /dev/null <<'EOF'
[Unit]
Description=Instant Mechanic API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/instant-mechanic-ops/backend
EnvironmentFile=/home/ubuntu/instant-mechanic-ops/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now instant-mechanic-api
sudo systemctl status instant-mechanic-api      # should say active (running)
curl localhost:4000/health                       # should return status ok
```

Logs, whenever you need them: `sudo journalctl -u instant-mechanic-api -f`

---

## Step 4 — A domain and HTTPS

**4a. Free subdomain.** Go to [duckdns.org](https://duckdns.org), sign in with Google or
GitHub, create a subdomain such as `instant-mechanic-api`, and set its IP to your EC2 public
IP. You now have `instant-mechanic-api.duckdns.org`.

**4b. Caddy as the reverse proxy.** Caddy requests a Let's Encrypt certificate automatically
and renews it, and it proxies WebSocket upgrades without extra configuration.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
instant-mechanic-api.duckdns.org {
    reverse_proxy localhost:4000
}
EOF

sudo systemctl restart caddy
```

Replace the hostname with your own. Then check from your laptop:

```bash
curl https://instant-mechanic-api.duckdns.org/health
```

You should get JSON over HTTPS. Your Swagger docs are now at
`https://instant-mechanic-api.duckdns.org/api/docs`.

If the certificate does not issue, confirm port 80 is open in the security group — Let's
Encrypt needs it for the challenge.

---

## Step 5 — Frontend on Vercel

1. Push the repository to GitHub if you have not already.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repository.
3. **Root Directory: `frontend`.** This matters — the repo holds two packages. Framework
   preset and build command are detected automatically.
4. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://instant-mechanic-api.duckdns.org` (no trailing slash)
5. Deploy. Copy the resulting URL, for example `https://instant-mechanic-ops.vercel.app`.

---

## Step 6 — Point the API back at Vercel

Back on EC2, put the real Vercel URL into `CORS_ORIGINS`:

```bash
cd ~/instant-mechanic-ops/backend
nano .env        # CORS_ORIGINS=https://instant-mechanic-ops.vercel.app
sudo systemctl restart instant-mechanic-api
```

Open the Vercel URL, sign in with `ops@instantmechanic.com` / `instant123`, and confirm the
indicator in the top bar reads **Live**. Watch the dispatch board for a few seconds — counts
should shift on their own as the simulator moves jobs.

---

## Verifying the deployment

| Check | How |
| --- | --- |
| API is up | `curl https://<api-domain>/health` |
| Docs are public | Open `https://<api-domain>/api/docs` in a private window |
| Auth works | Sign in on the Vercel URL |
| Realtime works | Top bar shows **Live**; the activity rail fills in on its own |
| CORS is right | No CORS errors in the browser console |
| Cross-client sync | Open two tabs, change a booking's status in one, watch the other update |

---

## Redeploying

**Frontend:** push to `main`; Vercel rebuilds automatically.

**Backend:**

```bash
ssh -i your-key.pem ubuntu@<PUBLIC_IP>
cd instant-mechanic-ops && git pull
cd backend && npm ci && npm run build
sudo systemctl restart instant-mechanic-api
```

---

## Troubleshooting

**"Cannot reach the operations API" in the dashboard.** `NEXT_PUBLIC_API_URL` is wrong or has a
trailing slash. It is baked in at build time, so change it in Vercel's settings and redeploy —
editing it alone does nothing.

**CORS errors.** `CORS_ORIGINS` on the server must match the browser's origin exactly, scheme
included, no trailing slash. Restart the service after editing `.env`.

**The connection indicator sits on "Reconnecting".** The socket cannot upgrade. Confirm Caddy
is proxying your API domain and that you are hitting `https://`, not the raw IP.

**The API will not start.** `sudo journalctl -u instant-mechanic-api -n 50`. Almost always
`DATABASE_URL` — Neon needs `?sslmode=require`.

**The instance runs out of memory during `npm run build`.** `t2.micro` has 1 GB. Add swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Seed data looks stale.** `npm run db:reset` regenerates it from scratch.
