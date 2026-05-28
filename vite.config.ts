// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig, loadEnv } from "@lovable.dev/vite-tanstack-config";
import { imagetools } from "vite-imagetools";
import { fileURLToPath } from "node:url";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "development", process.cwd(), "");
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return {
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [imagetools()],
    resolve: {
      alias: {
        entities: fileURLToPath(new URL("./node_modules/entities", import.meta.url)),
      },
    },
  },
  };
});
