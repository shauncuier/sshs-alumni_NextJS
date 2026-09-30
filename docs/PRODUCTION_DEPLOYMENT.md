# Production Deployment & Operations Guide
### Sabuj Shikshayatan Government High School Alumni Association

This document outlines the end-to-end production deployment, configuration, security hardening, and operational maintenance procedures for the **SSGHS Alumni Association Platform**.

> **Hosting requirement — read first.** The join form stores every member's profile photo on the server's disk (under `UPLOADS_DIR`, see [Member photos](#member-photos-uploads-directory)). Production must therefore run on a host with a **persistent, backed-up disk**: a VPS (Option B), a cPanel Node.js app, or Docker with a mounted volume (Option C). **Vercel and other serverless hosts are not supported for joining** — their file systems are read-only or wiped between requests, so member photos would be lost. The photo processing library `sharp` also needs its native binary for the server's own platform: run `npm ci` **on the server** (never copy `node_modules` from a Windows or macOS machine).

---

## 1. Production Architecture Overview

```text
[ Client Browsers & Mobile Devices ]
                 │
                 ▼ (HTTPS / TLS 1.3)
      [ Cloudflare / Reverse Proxy ]
                 │
                 ▼
        [ Next.js 16 App Router ]
      (Node.js server, persistent disk)
       ├── NextAuth Authentication (JWT + Bcrypt)
       ├── API Routes & Data Validation
       └── Dynamic Server-Rendered & Static Pages
                 │
                 ▼ (Encrypted Connection / TLS)
      [ MySQL / MariaDB Database ]
        (Managed MySQL / cPanel Hosting)
```

---

## 2. Environment Variables Checklist

Ensure the following variables are configured in your production hosting dashboard or `.env.production` file:

| Variable | Required | Description | Example Production Value |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | MySQL connection string (URL-encode special characters) | `mysql://app_user:pass@db.example.com:3306/sshs_alumni` |
| `NEXTAUTH_SECRET` | **Yes** | 32+ character cryptographic secret | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **Yes** | Canonical public domain | `https://alumni.sabujsghs.edu.bd` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public frontend URL | `https://alumni.sabujsghs.edu.bd` |
| `NEXT_PUBLIC_SCHOOL_NAME` | **Yes** | Official school name | `Sabuj Shikshayatan Government High School` |
| `UPLOADS_DIR` | No | Absolute path where member photos and proof-of-study documents are stored (must persist, be backed up, and never be served as static files) | `/var/lib/sshs-alumni/uploads` |
| `NEXT_PUBLIC_SCHOOL_EIIN` | **Yes** | Bangladesh Board EIIN | `105070` |

### Member photos (uploads directory)

Profile photos given when joining are written to disk under `UPLOADS_DIR` (default `<app folder>/uploads`, i.e. `uploads/avatars/<id>/avatar.webp` and `original.jpg`). Point `UPLOADS_DIR` at a directory outside the release folder that **persists across deploys and is included in your backups**: losing it loses every member photo, including the print masters for the magazine and cards. The app process needs write access to it.

### Proof-of-study documents (`uploads/proofs`) — sensitive

New members also upload a document that shows they studied at SSGHS (SSC certificate, marksheet, school ID card and so on). These are stored under `UPLOADS_DIR/proofs/<id>/document.pdf` or `document.jpg` and contain personal data:

- **Private:** they are served only through `/api/media/proofs/...`, which requires an admin session. **Never** expose `UPLOADS_DIR` (or `uploads/proofs`) through the web server as static files — no nginx `location`/`alias`, cPanel public folder or CDN pointing at it. Keep `UPLOADS_DIR` outside `public/` and the web root, readable only by the app's user (e.g. `chmod 700`).
- **Backed up** with the rest of `UPLOADS_DIR`, and protected like the database backups (restricted access, encrypted where possible).
- **Short-lived:** the app deletes each file once the membership is approved or rejected. If a deletion fails (logged as `[proof-retention] ...` with the request id), it is retried the next time an admin opens the verification queue.

This needs a server with a persistent disk (a VPS or cPanel Node.js app, Option B, or Docker with a mounted volume, Option C). It is **not supported on Vercel** (serverless file systems are read-only or temporary); do not deploy the join form there without moving photo storage to object storage first.

---

## 3. Deployment Option A: Vercel (not supported for joining)

> ⚠️ **Not supported while member photos are stored on disk.** Vercel's serverless file system does not keep files, so photos uploaded through the join form would be lost. Use Option B or C. The steps below only apply if photo storage is first moved to object storage (e.g. S3 or R2).

1. Push your code to a GitHub or GitLab repository.
2. Log into [Vercel](https://vercel.com/) and click **New Project**.
3. Import the `sshs-alumni` repository.
4. Set Framework Preset to **Next.js**.
5. In **Environment Variables**, paste the keys from the checklist above.
6. Click **Deploy**. Vercel will build the optimized production output, configure edge edge routing, and provision SSL automatically.

---

## 4. Deployment Option B: Ubuntu VPS (Nginx + PM2 + SSL)

### Step 1: Install Node.js & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### Step 2: Clone and Build
```bash
git clone https://github.com/your-org/sshs-alumni.git /var/www/sshs-alumni
cd /var/www/sshs-alumni
npm ci
cp .env.example .env.production
# Edit .env.production with your real secrets
npm run build
```

### Step 3: Launch with PM2
```bash
pm2 start npm --name "ssghs-alumni" -- start
pm2 save
pm2 startup
```

### Step 4: Configure Nginx
Create `/etc/nginx/sites-available/ssghs-alumni`:
```nginx
server {
    server_name alumni.sabujsghs.edu.bd;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and apply SSL:
```bash
sudo ln -s /etc/nginx/sites-available/ssghs-alumni /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d alumni.sabujsghs.edu.bd
```

---

## 5. Deployment Option C: Docker & Containerization

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

Member photos must survive container rebuilds: mount a persistent, backed-up volume and point `UPLOADS_DIR` at it, e.g. `docker run -v /srv/sshs-alumni/uploads:/data/uploads -e UPLOADS_DIR=/data/uploads ...`. The image runs `npm ci` inside the Linux build stage, so `sharp` gets the Linux binary it needs.

---

## 6. Security Hardening Checklist

- [x] **Strict Transport Security (HSTS)** enabled via `next.config.ts`.
- [x] **X-Frame-Options: SAMEORIGIN** to prevent UI redressing & clickjacking.
- [x] **X-Content-Type-Options: nosniff** to enforce MIME type verification.
- [x] **Bcrypt Salt Rounds**: Set to 10 for password hashing.
- [x] **Role-Based Access Control**: Middleware protects `/admin/*` requiring `ADMIN` or `SUPER_ADMIN` credentials.
- [x] **Input Sanitization**: API routes validate and sanitize payloads.
- [x] **Database Isolation**: Database connection runs with least-privilege credentials.

---

## 7. Disaster Recovery & Backups

### Automated MySQL Backups
Set up a daily cron task for `mysqldump` (store credentials in `~/.my.cnf`, not on the command line):
```bash
0 2 * * * mysqldump --single-transaction sshs_alumni | gzip > "/var/backups/mysql/sshs_alumni-$(date +\%F).sql.gz"
```

Retention policy: Keep 7 daily backups, 4 weekly backups, and 12 monthly archives in secure off-site object storage.
