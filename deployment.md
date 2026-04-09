# Deployment & CI/CD Documentation

> **Repo:** aditya06121/local-server · **Hardware:** Raspberry Pi Zero 2W

---

## 1. Stack Overview

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Hardware         | Raspberry Pi Zero 2W (512 MB RAM, ARM64)    |
| OS               | Raspberry Pi OS Lite 64-bit                 |
| Backend          | Node.js 22 + TypeScript                     |
| Frontend         | React (Vite) — static build                 |
| Web Server       | Nginx (inside Docker container)             |
| Database         | Supabase (cloud) via Drizzle ORM            |
| Containerization | Docker + Docker Compose                     |
| CI/CD            | GitHub Actions (cloud runners)              |
| SSH Access       | Tailscale (stable 100.x.x.x IP)             |
| Tunnel           | Cloudflare Quick Tunnel (trycloudflare.com) |
| Image Registry   | GitHub Container Registry (ghcr.io)         |

---

## 2. Architecture

### Request Flow

```
Internet
  └── Cloudflare Edge (*.trycloudflare.com)
        └── Pi :80 (cloudflared systemd)
              └── Frontend container (Nginx)
                    ├── /api/*  →  rewrite  →  Backend container :3000
                    └── /*      →  Static React files
```

### Docker Services

| Container | Image                                            | Port            | Role          |
| --------- | ------------------------------------------------ | --------------- | ------------- |
| backend   | ghcr.io/aditya06121/local-server/backend:latest  | 3000 (internal) | Node.js API   |
| frontend  | ghcr.io/aditya06121/local-server/frontend:latest | 80 (host)       | Nginx + React |

### Systemd Services (outside Docker)

| Service           | Role                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| cloudflared-quick | Exposes port 80 to internet via Cloudflare Quick Tunnel                        |
| tunnel-notify     | Watches cloudflared logs, sends new URL via Telegram + updates GitHub homepage |
| tailscaled        | Tailscale daemon for SSH access                                                |

---

## 3. Directory Structure

### Repository

```
repo/
├── client/
│   ├── Dockerfile        # nginx:alpine image
│   ├── nginx.conf        # reverse proxy config
│   └── src/
├── server/
│   ├── Dockerfile        # node:22-alpine image
│   └── src/
├── docker-compose.yml
└── .github/
    └── workflows/
        ├── backend.yml
        └── frontend.yml
```

### On the Pi

```
/home/aditya/
├── app/                  # cloned repo
│   └── .env              # runtime secrets (written by CI/CD on each deploy)
└── tunnel-notify.sh      # Telegram notifier script
```

---

## 4. Dockerfiles

### Backend (`server/Dockerfile`)

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "--max-old-space-size=128", "dist/index.js"]
```

Key decisions:

- `node:22-alpine` — minimal image, ~31 MB RAM at runtime
- `--omit=dev` — no devDependencies in production image
- `--max-old-space-size=128` — caps Node heap at 128 MB to prevent OOM on Pi
- `dist/` is pre-built by CI — no TypeScript compiler inside the image

### Frontend (`client/Dockerfile`)

```dockerfile
FROM nginx:alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

Key decisions:

- `nginx:alpine` — ~4 MB RAM at runtime
- React app pre-built by CI — no Node.js in this image
- Nginx handles both static files and API proxying

---

## 5. Nginx Configuration

**File:** `client/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

The rewrite strips `/api/` before forwarding — `/api/auth/login` reaches the backend as `/auth/login`. Backend is referenced by Docker Compose service name `backend`, not `localhost`.

---

## 6. Docker Compose

**File:** `docker-compose.yml` (root of repo)

```yaml
services:
  backend:
    image: ghcr.io/aditya06121/local-server/backend:latest
    container_name: backend
    restart: unless-stopped
    env_file:
      - .env
    networks:
      - app-network

  frontend:
    image: ghcr.io/aditya06121/local-server/frontend:latest
    container_name: frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --url http://frontend:80 --no-autoupdate
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

---

## 7. CI/CD Pipelines

### Overview

Both pipelines run on GitHub-hosted `ubuntu-latest` runners. The Pi has no self-hosted runner — all building happens in the cloud.

| Workflow     | Trigger             | Builds                              | Deploys                            |
| ------------ | ------------------- | ----------------------------------- | ---------------------------------- |
| backend.yml  | Push to `server/**` | TypeScript → Docker image → ghcr.io | SSH → docker compose pull backend  |
| frontend.yml | Push to `client/**` | Vite build → Docker image → ghcr.io | SSH → docker compose pull frontend |

### Backend Pipeline (`backend.yml`)

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - "server/**"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: secrets

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        working-directory: server
        run: npm ci

      - name: Setup env
        working-directory: server
        run: |
          echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" > .env
          echo "DIRECT_URL=${{ secrets.DIRECT_URL }}" >> .env
          echo "ACCESS_TOKEN_SECRET=${{ secrets.ACCESS_TOKEN_SECRET }}" >> .env
          echo "REFRESH_TOKEN_SECRET=${{ secrets.REFRESH_TOKEN_SECRET }}" >> .env

      - name: Run tests
        working-directory: server
        run: npm test

      - name: Build TypeScript
        working-directory: server
        run: npm run build

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
        with:
          platforms: arm64

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          use: true

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: ./server
          platforms: linux/arm64
          push: true
          tags: ghcr.io/aditya06121/local-server/backend:latest

      - name: Tailscale
        uses: tailscale/github-action@v4
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:ci

      - name: Deploy to Pi
        run: |
          eval $(ssh-agent -s)
          echo "${{ secrets.PI_SSH_KEY }}" | ssh-add -
          ssh -o StrictHostKeyChecking=no aditya@${{ secrets.PI_TAILSCALE_IP }} '
            cd /home/aditya/app &&
            git pull &&
            echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" > .env &&
            echo "DIRECT_URL=${{ secrets.DIRECT_URL }}" >> .env &&
            echo "ACCESS_TOKEN_SECRET=${{ secrets.ACCESS_TOKEN_SECRET }}" >> .env &&
            echo "REFRESH_TOKEN_SECRET=${{ secrets.REFRESH_TOKEN_SECRET }}" >> .env &&
            docker compose pull backend &&
            docker compose up -d backend
          '
```

### Frontend Pipeline (`frontend.yml`)

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - "client/**"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: secrets

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: client/package-lock.json

      - name: Install dependencies
        working-directory: client
        run: npm ci

      - name: Build frontend
        working-directory: client
        run: npm run build

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
        with:
          platforms: arm64

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          use: true

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./client
          platforms: linux/arm64
          push: true
          tags: ghcr.io/aditya06121/local-server/frontend:latest

      - name: Tailscale
        uses: tailscale/github-action@v4
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:ci

      - name: Deploy to Pi
        run: |
          eval $(ssh-agent -s)
          echo "${{ secrets.PI_SSH_KEY }}" | ssh-add -
          ssh -o StrictHostKeyChecking=no aditya@${{ secrets.PI_TAILSCALE_IP }} '
            cd /home/aditya/app &&
            git pull &&
            docker compose pull frontend &&
            docker compose up -d frontend
          '
```

### ARM64 Cross-Compilation Note

GitHub runners are x86_64 but the Pi is ARM64. QEMU + Buildx handle cross-compilation so images run natively on the Pi without emulation overhead at runtime.

---

## 8. GitHub Secrets

All secrets live in the `secrets` environment (Settings → Environments → secrets):

| Secret                 | Description                           |
| ---------------------- | ------------------------------------- |
| `TS_OAUTH_CLIENT_ID`   | Tailscale OAuth client ID             |
| `TS_OAUTH_SECRET`      | Tailscale OAuth secret                |
| `PI_TAILSCALE_IP`      | Pi's Tailscale IP (100.x.x.x)         |
| `PI_SSH_KEY`           | Private SSH key for CI to SSH into Pi |
| `DATABASE_URL`         | Supabase pooled connection string     |
| `DIRECT_URL`           | Supabase direct connection string     |
| `ACCESS_TOKEN_SECRET`  | JWT access token signing secret       |
| `REFRESH_TOKEN_SECRET` | JWT refresh token signing secret      |

---

## 9. Networking

### Tailscale (SSH Access)

Tailscale gives the Pi a stable private IP (`100.x.x.x`) regardless of the home network's public IP. GitHub Actions registers as an ephemeral device using OAuth + `tag:ci`, SSHes into the Pi, then auto-removes itself after the workflow ends.

- `tag:ci` must be declared in Tailscale ACL under `tagOwners`
- Pi runs `tailscaled` as a systemd service, auto-starts on boot
- SSH uses key authentication via `PI_SSH_KEY` secret

### Cloudflare Quick Tunnel

Provides a public HTTPS URL (`*.trycloudflare.com`) without requiring a domain or paid plan. URL changes on every cloudflared restart.

**Systemd service:** `/etc/systemd/system/cloudflared-quick.service`

```ini
[Unit]
Description=Cloudflare Quick Tunnel
After=network.target

[Service]
Type=simple
User=aditya
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:80 --no-autoupdate
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 10. Tunnel URL Notifier

**Script:** `/home/aditya/tunnel-notify.sh`
**Service:** `/etc/systemd/system/tunnel-notify.service`

On every cloudflared restart the script watches `journalctl` output, detects the new `*.trycloudflare.com` URL, then:

- Sends a Telegram message with the new URL
- Updates the GitHub repository homepage field via GitHub API

The service depends on `cloudflared-quick.service` and restarts automatically if it crashes.

---

## 11. Memory Budget

Measured at idle with full stack running on Raspberry Pi OS Lite 64-bit:

| Service                    | RAM         |
| -------------------------- | ----------- |
| OS Lite                    | ~80 MB      |
| Docker daemon + containerd | ~60 MB      |
| Tailscale                  | ~20 MB      |
| Cloudflared (systemd)      | ~20 MB      |
| Backend container          | ~31 MB      |
| Frontend container         | ~4 MB       |
| **Total used**             | **~215 MB** |
| **Available headroom**     | **~200 MB** |

Each additional Node.js service costs ~30–40 MB, allowing 4–5 more services before memory pressure.

---

## 12. Debugging Commands

### Docker

```bash
docker ps                                    # list running containers
docker logs backend                          # backend logs
docker logs frontend                         # nginx logs
docker logs cloudflared                      # cloudflared container logs
docker compose down && docker compose up -d  # full restart
docker stats                                 # live resource usage

# check container memory
docker inspect --format='{{.Name}} {{.State.Pid}}' $(docker ps -q) | while read name pid; do
  mem=$(cat /proc/$pid/status | grep VmRSS | awk '{print $2}')
  echo "$name: ${mem} kB"
done
```

### Systemd

```bash
sudo systemctl status cloudflared-quick
sudo systemctl status tunnel-notify
sudo systemctl status tailscaled

journalctl -u cloudflared-quick -n 50 --no-pager
journalctl -u tunnel-notify -n 50 --no-pager
```

### Network

```bash
ss -tlnp | grep 80          # check what's on port 80
curl http://localhost/       # test frontend directly
curl http://localhost/api/   # test API through nginx
```

### Memory

```bash
free -h                      # overall memory
docker stats --no-stream     # per-container usage
```

### SSH (from local machine via Tailscale)

```bash
ssh aditya@<tailscale-ip>
```
