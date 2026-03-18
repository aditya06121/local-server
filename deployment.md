# Fullstack Deployment Documentation

## Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Hardware        | Raspberry Pi Zero 2W                |
| OS              | Raspberry Pi OS (Debian)            |
| Backend         | Node.js 22 + TypeScript             |
| Frontend        | React (Vite)                        |
| Web Server      | Nginx                               |
| Process Manager | systemd                             |
| CI/CD           | GitHub Actions (self-hosted runner) |

---

## Directory Structure on Pi

```
/home/aditya/apps/fullstack-app/
├── server/          # Deployed backend (compiled TS + node_modules)
│   ├── dist/        # Compiled TypeScript output
│   ├── node_modules/
│   └── server.log   # stdout + stderr from Node process
└── client/          # Built React static files
    ├── index.html
    └── assets/
```

---

## Systemd Service

**File:** `/etc/systemd/system/app.service`

```ini
[Unit]
Description=App server
After=network.target

[Service]
Type=simple
User=aditya
WorkingDirectory=/home/aditya/apps/fullstack-app/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/home/aditya/apps/fullstack-app/server/server.log
StandardError=append:/home/aditya/apps/fullstack-app/server/server.log

[Install]
WantedBy=multi-user.target
```

**Apply changes after editing:**

```bash
sudo systemctl daemon-reload
sudo systemctl restart app
```

---

## Nginx Config

**File:** `/etc/nginx/sites-available/fullstack-app`

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://localhost:3000;
    }

    location / {
        root /home/aditya/apps/fullstack-app/client;
        try_files $uri $uri/ /index.html;
    }
}
```

**Symlink to enable:**

```bash
sudo ln -s /etc/nginx/sites-available/fullstack-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

---

## Sudoers Rules

**File:** `/etc/sudoers` (edit via `sudo visudo`)

```
aditya ALL=(ALL) NOPASSWD: /bin/systemctl restart app, /bin/systemctl reload nginx
```

---

## File Permissions

Nginx runs as `www-data` and needs read access to the client dist folder:

```bash
chmod 755 /home/aditya
chmod -R 755 /home/aditya/apps/fullstack-app/client
```

---

## CI/CD Workflows

### `.github/workflows/backend.yml`

Triggers on changes to `server/**`

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - "server/**"

jobs:
  deploy-backend:
    runs-on: self-hosted
    timeout-minutes: 15

    defaults:
      run:
        working-directory: server

    env:
      NODE_OPTIONS: "--max-old-space-size=256"

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json

      - name: Configure npm for low memory
        run: |
          npm config set maxsockets 1
          npm config set audit false
          npm config set fund false
          npm config set progress false

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build TypeScript
        run: npm run build

      - name: Remove dev dependencies
        run: npm prune --omit=dev

      - name: Deploy backend
        run: rsync -av --delete ${{ github.workspace }}/server/ $HOME/apps/fullstack-app/server/

      - name: Restart backend service
        run: sudo systemctl restart app
```

### `.github/workflows/frontend.yml`

Triggers on changes to `client/**`

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - "client/**"

jobs:
  deploy-frontend:
    runs-on: self-hosted

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Prepare directories
        run: mkdir -p $HOME/apps/fullstack-app/client

      - name: Install frontend dependencies
        working-directory: client
        run: npm install

      - name: Build frontend
        working-directory: client
        run: npm run build

      - name: Deploy frontend
        run: rsync -av --delete client/dist/ $HOME/apps/fullstack-app/client/

      - name: Reload nginx
        run: sudo systemctl reload nginx
```

---

## Request Routing

```
External Request (port 80)
        │
        ▼
      Nginx
        │
        ├── /api/*  ──▶  localhost:3000  (Node.js)
        │
        └── /*      ──▶  /home/aditya/apps/fullstack-app/client  (static files)
```

Port 3000 is internal only — never accessed directly.

**Frontend API calls must use relative paths:**

```javascript
// correct
fetch("/api/users");

// wrong
fetch("http://localhost:3000/api/users");
```

**Vite dev proxy** (`vite.config.js`):

```javascript
export default {
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
};
```

---

## Access

| What        | URL                          |
| ----------- | ---------------------------- |
| Frontend    | `http://<pi-ip>/`            |
| Backend API | `http://<pi-ip>/api/<route>` |

Find Pi IP: `hostname -I`

---

## Debugging Commands

### systemd

```bash
# service status
sudo systemctl status app

# last 50 log lines
sudo journalctl -u app -n 50 --no-pager

# follow live logs
sudo journalctl -u app -f

# restart service
sudo systemctl restart app

# check if enabled on boot
sudo systemctl is-enabled app
```

### Application Logs

```bash
# tail server log
tail -f /home/aditya/apps/fullstack-app/server/server.log

# last 100 lines
tail -n 100 /home/aditya/apps/fullstack-app/server/server.log
```

### Nginx

```bash
# validate config syntax
sudo nginx -t

# reload config (no downtime)
sudo systemctl reload nginx

# full restart
sudo systemctl restart nginx

# nginx status
sudo systemctl status nginx

# nginx error log
sudo tail -f /var/log/nginx/error.log

# nginx access log
sudo tail -f /var/log/nginx/access.log
```

### Network

```bash
# check what's listening on port 3000
ss -tlnp | grep 3000

# check what's listening on port 80
ss -tlnp | grep 80

# test backend directly
curl http://localhost:3000/api/<route>

# test via nginx
curl http://localhost/api/<route>
```

### Deployed Files

```bash
# check backend files exist
ls -la /home/aditya/apps/fullstack-app/server/dist/

# check frontend files exist
ls -la /home/aditya/apps/fullstack-app/client/

# check file permissions
ls -la /home/aditya/apps/fullstack-app/client/index.html
```

### GitHub Actions Runner

```bash
# runner status
sudo systemctl status actions.runner.*

# runner logs
sudo journalctl -u actions.runner.* -n 50 --no-pager
```
