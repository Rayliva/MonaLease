import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";

/** Match Vite `base` (e.g. `/monalease/` on racheloalden.com) for client-side routes. */
function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return undefined;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/**
 * With a subpath `base`, BrowserRouter needs the host to serve `index.html` for
 * `/monalease/room/...` on refresh. If that fallback is missing, the main site
 * HTML loads instead (wrong page). HashRouter keeps room URLs in the fragment
 * (`/monalease/#/room/...`) so only `/monalease/` must resolve to the app.
 */
export function AppRouter() {
  const basename = routerBasename();
  const useHash =
    import.meta.env.BASE_URL !== "/" && import.meta.env.BASE_URL !== "";
  const routes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
  // HashRouter reads paths from the hash (e.g. #/room/x → /room/x). Do not set
  // basename to the Vite subpath — that only applies to the server URL path
  // (/monalease/), not the hash segment, and would break matching.
  if (useHash) {
    return <HashRouter>{routes}</HashRouter>;
  }
  return <BrowserRouter basename={basename}>{routes}</BrowserRouter>;
}
