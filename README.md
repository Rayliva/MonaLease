# Carousel Canvas (MonaLease)

Real-time collaborative drawing game: **React**, **Vite**, **TypeScript**, **Liveblocks**, **Fabric.js v7**, **Zustand**, **Tailwind CSS**, **Framer Motion**.

## Local development

```bash
npm install
cp .env.local.example .env.local
# Add your Liveblocks public API key to .env.local
npm run dev
```

## Production build

- **Root domain or `localhost`:** `npm run build` then serve the `dist/` folder.
- **Subpath** (`https://racheloalden.com/monalease/`): `npm run build:site` — sets Vite `base` to `/monalease/`. **nginx** (not Apache) handles SPA deep links — see below.

## Deploy (nginx)

1. In the [Liveblocks dashboard](https://liveblocks.io/dashboard), add your site origin (e.g. `https://racheloalden.com`) if required for your API key.
2. Run `npm run build:site` with `VITE_LIVEBLOCKS_PUBLIC_KEY` set (e.g. `.env.production.local` on the build machine).
3. Copy **everything inside** `dist/` to the folder nginx serves for that URL (e.g. `/var/www/html/monalease/` so files are `.../monalease/index.html`, `.../monalease/assets/`, etc.).
4. Add a **`location`** so refreshes and direct links to `/monalease/room/...` return `index.html` (client router). Example if static files live under `/var/www/html/monalease/`:

```nginx
location /monalease/ {
    root /var/www/html;
    try_files $uri $uri/ /monalease/index.html;
}
```

Put that inside your `server { ... }` block, then `sudo nginx -t` and `sudo systemctl reload nginx`.

5. Open `/monalease/`, join a room, then refresh the room URL to confirm the fallback works.

## Portfolio link

The project card on [racheloalden.com](https://racheloalden.com) lives in the other repo: `racheloalden/index.html` (Personal projects section).
