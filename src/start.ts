import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  const p = new URL(request.url).pathname;
  if (p.startsWith("/lovable/") || p === "/email/unsubscribe") {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    const isServerFunctionRequest = request.headers.get("x-tsr-rpc") === "server-fn"
      || request.url.includes("_server-fn")
      || request.url.includes("_serverFn");
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    if (isServerFunctionRequest) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
