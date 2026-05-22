import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { CookieConsent } from "@/components/CookieConsent";
import { SiteScriptsInjector } from "@/components/SiteScriptsInjector";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Você pode tentar recarregar ou voltar para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "REVMED" },
      { name: "description", content: "Plataforma premium de preparação para a prova prática do Revalida: estações clínicas, checklists, cronômetro, feedback inteligente e evolução por competência." },
      { name: "author", content: "REVMED" },
      { property: "og:title", content: "REVMED" },
      { property: "og:description", content: "Plataforma premium de preparação para a prova prática do Revalida: estações clínicas, checklists, cronômetro, feedback inteligente e evolução por competência." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://revmed.app.br" },
      { property: "og:site_name", content: "REVMED" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#07111F" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Revalida" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "twitter:title", content: "REVMED" },
      { name: "twitter:description", content: "Plataforma premium de preparação para a prova prática do Revalida: estações clínicas, checklists, cronômetro, feedback inteligente e evolução por competência." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest?v=revmed-2" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=revmed-2" },
      { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico?v=revmed-2" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png?v=revmed-2" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png?v=revmed-2" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png?v=revmed-2" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=revmed-2" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Sora:wght@600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <PWAInstallBanner />
        <SiteScriptsInjector />
        <CookieConsent />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
