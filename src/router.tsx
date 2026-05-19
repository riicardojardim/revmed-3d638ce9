import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch on hover/touchstart de qualquer <Link/>, com latência mínima.
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    // Mantém dado pré-carregado fresco por 30s para evitar refetch ao entrar.
    defaultPreloadStaleTime: 30_000,
  });


  return router;
};
