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
- **Subpath** (`https://racheloalden.com/monalease/`): `npm run build:site` — sets Vite `base` to `/monalease/`. Room links use a **hash** (`/monalease/#/room/...`) so refresh and invite links work as long as `/monalease/` serves the app’s `index.html`, even if the host does not rewrite `/monalease/room/...` to that file (which would otherwise load the main site and look broken).

## Deploy (nginx)

1. In the [Liveblocks dashboard](https://liveblocks.io/dashboard), add your site origin (e.g. `https://racheloalden.com`) if required for your API key.
2. Run `npm run build:site` with `VITE_LIVEBLOCKS_PUBLIC_KEY` set (e.g. `.env.production.local` on the build machine).
3. Copy **everything inside** `dist/` to the folder nginx serves for that URL (e.g. `/var/www/html/monalease/` so you have `.../monalease/index.html`, `.../monalease/assets/`, etc.).
4. (Optional) Add **`try_files`** if you prefer **path**-based room URLs (`/monalease/room/...` without `#`) and have configured the app with `BrowserRouter` only — e.g.:

```nginx
location /monalease/ {
    root /var/www/html;
    try_files $uri $uri/ /monalease/index.html;
}
```

Put that inside your `server { ... }` block, then `sudo nginx -t` and `sudo systemctl reload nginx`. The default subpath build uses **hash routing**, so this is not required for room refresh or invite links.

5. Open `https://racheloalden.com/monalease/`, join a room, copy the invite link, and open it in a new tab to confirm you stay in the game (not on the portfolio layout).

## Portfolio link

The project card on [racheloalden.com](https://racheloalden.com) lives in the other repo: `racheloalden/index.html` — **Play Live** should point at `https://racheloalden.com/monalease/`.
