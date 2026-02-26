// Minimal service worker for PWA installability.
// No offline caching — the app requires a live Convex backend.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
