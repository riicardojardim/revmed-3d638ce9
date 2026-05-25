import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getActiveProvider } from "./provider-settings.server";

export const getCheckoutLink = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      planSlug: z.enum(["completo", "mensal", "ator"]),
      userEmail: z.string().email(),
      userName: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const provider = await getActiveProvider("payment");
    if (!provider) {
      return { ok: false, error: "Nenhum provedor de pagamento ativo. Vá em Admin > Provedores e ative um." };
    }

    const extra = provider.extra ?? {};

    if (provider.provider_key === "hotmart") {
      // Hotmart: geralmente usa link de checkout direto com product_id
      const productId = extra.product_id as string | undefined;
      const checkoutBase = extra.checkout_base_url as string | undefined;
      if (!productId) {
        return { ok: false, error: "Hotmart configurado sem product_id. Adicione no campo Extra (JSON) do provedor." };
      }
      // Hotmart permite parâmetros de afiliado e email do comprador
      const url = new URL(checkoutBase || `https://checkout.hotmart.com`);
      url.pathname = url.pathname || "/";
      url.searchParams.set("off", productId);
      url.searchParams.set("email", data.userEmail);
      url.searchParams.set("name", data.userName);
      return { ok: true, url: url.toString(), provider: "hotmart" };
    }

    if (provider.provider_key === "stripe") {
      // Stripe: cria uma session de checkout (simplificado - em produção usar stripe SDK)
      const priceId = extra.price_id as string | undefined;
      const checkoutBase = extra.checkout_base_url as string | undefined;
      if (!priceId && !checkoutBase) {
        return { ok: false, error: "Stripe configurado sem price_id ou checkout_base_url. Adicione no campo Extra (JSON) do provedor." };
      }
      if (checkoutBase) {
        const url = new URL(checkoutBase);
        url.searchParams.set("prefilled_email", data.userEmail);
        return { ok: true, url: url.toString(), provider: "stripe" };
      }
      // Se não tiver checkout_base_url, retorna erro indicando que precisa de integração completa
      return { ok: false, error: "Stripe: configure checkout_base_url no Extra (JSON) do provedor para gerar link direto." };
    }

    if (provider.provider_key === "mercado_pago") {
      // Mercado Pago: preference API ou link externo
      const preferenceBase = extra.preference_url as string | undefined;
      const externalUrl = extra.checkout_url as string | undefined;
      if (externalUrl) {
        const url = new URL(externalUrl);
        url.searchParams.set("email", data.userEmail);
        return { ok: true, url: url.toString(), provider: "mercado_pago" };
      }
      if (preferenceBase) {
        // Em produção, aqui faria POST na API de preference do MP
        return { ok: false, error: "Mercado Pago: configure checkout_url no Extra (JSON) do provedor para gerar link direto, ou solicite integração completa." };
      }
      return { ok: false, error: "Mercado Pago: configure checkout_url ou preference_url no Extra (JSON) do provedor." };
    }

    return { ok: false, error: `Provedor ${provider.provider_label} não tem integração de checkout automática ainda.` };
  });
