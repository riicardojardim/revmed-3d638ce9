// Browser-side helpers que falam direto com a API pública do Mercado Pago.
// Os dados de cartão NÃO passam pelo nosso servidor — vão do navegador
// para o MP, retornando apenas um token de uso único.

const MP = "https://api.mercadopago.com";

export async function getPaymentMethodFromBin(
  publicKey: string,
  bin: string,
): Promise<{ id: string; issuer_id?: string } | null> {
  try {
    // Tentamos o endpoint de busca por BIN primeiro
    const url = `${MP}/v1/payment_methods?public_key=${encodeURIComponent(publicKey)}&bin=${encodeURIComponent(bin)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json().catch(() => []);
      const pm = Array.isArray(json) ? json[0] : json?.results?.[0];
      if (pm?.id) {
        return { id: pm.id, issuer_id: pm.issuer?.id ? String(pm.issuer.id) : undefined };
      }
    }

    // Se falhar, tentamos o search que alguns SDKs usam
    const searchUrl = `${MP}/v1/payment_methods/search?public_key=${encodeURIComponent(publicKey)}&bin=${encodeURIComponent(bin)}`;
    const resSearch = await fetch(searchUrl);
    if (resSearch.ok) {
      const jsonSearch = await resSearch.json().catch(() => ({}));
      const pmSearch = jsonSearch?.results?.[0];
      if (pmSearch?.id) {
        return { id: pmSearch.id, issuer_id: pmSearch.issuer?.id ? String(pmSearch.issuer.id) : undefined };
      }
    }
  } catch (err) {
    console.error("[mercadopago] getPaymentMethodFromBin failed", err);
  }
  return null;
}

export async function createCardToken(
  publicKey: string,
  input: {
    cardNumber: string;
    cardholderName: string;
    expMonth: string;
    expYear: string; // 2 ou 4 dígitos
    securityCode: string;
    docNumber: string;
  },
): Promise<{ id: string; payment_method_id?: string; issuer_id?: string }> {
  const expirationYear =
    input.expYear.length === 2 ? `20${input.expYear}` : input.expYear;

  const body = {
    card_number: input.cardNumber.replace(/\s/g, ""),
    cardholder: {
      name: input.cardholderName,
      identification: { type: "CPF", number: input.docNumber.replace(/\D/g, "") },
    },
    expiration_month: Number(input.expMonth),
    expiration_year: Number(expirationYear),
    security_code: input.securityCode,
  };

  const res = await fetch(`${MP}/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  const json = await res.json().catch(() => ({}));
  
  if (!res.ok || !json?.id) {
    console.error("[mercadopago] card_token error", json);
    const msg = json?.cause?.[0]?.description || json?.message || "Não foi possível validar o cartão.";
    throw new Error(msg);
  }
  
  return { 
    id: json.id as string, 
    payment_method_id: json.payment_method_id as string | undefined,
    issuer_id: json.issuer?.id ? String(json.issuer.id) : undefined
  };
}