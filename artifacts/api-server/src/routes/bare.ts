import { createBareServer } from "@tomphttp/bare-server-node";
import type { Application } from "express";

export function mountBareServer(app: Application) {
  const bare = createBareServer("/bare/");
  app.use((req, res, next) => {
    if (req.url.startsWith("/bare/")) {
      bare.routeRequest(req, res);
    } else {
      next();
    }
  });
}
