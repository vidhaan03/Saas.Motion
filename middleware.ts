import { updateSession } from "./lib/supabase/middleware";
import type { NextRequest } from "next/server";

export const middleware = (request: NextRequest) => updateSession(request);

export const config = {
  matcher: [
    // Run on every request except Next internals + obviously-static assets.
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mp3)$).*)",
  ],
};
