import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload desativado: a versão atual do @tanstack/router-core estoura
    // "Cannot read properties of undefined (reading '_nonReactive')" durante
    // preloadRoute, o que engasga cliques em <Link>. Reativar quando atualizarmos.
    defaultPreload: false,
    defaultPreloadStaleTime: 0,
  });


  return router;
};
