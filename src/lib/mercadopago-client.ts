// Browser-side helpers que falam direto com a API pública do Mercado Pago.
// Os dados de cartão NÃO passam pelo nosso servidor — vão do navegador
// para o MP, retornando apenas um token de uso único.

const MP = "https://api.mercadopago.com";

export async function getPaymentMethodFromBin(
  publicKey: string,
  bin: string,
): Promise<{ id: string; issuer_id?: string } | null> {
  try {
    // 1. Tentamos o endpoint mais comum para BINs
    const url = `${MP}/v1/payment_methods?public_key=${encodeURIComponent(publicKey)}`;
    const res = await fetch(url);
    if (res.ok) {
      const list = await res.json().catch(() => []);
      if (Array.isArray(list)) {
        // Filtramos os métodos que aceitam este BIN
        // Infelizmente a API de listagem simples não traz a lista de BINs por padrão em alguns casos,
        // mas traz o pattern ou podemos inferir.
        // No entanto, o endpoint com ?bin= é o oficial.
        
        const resWithBin = await fetch(`${url}&bin=${encodeURIComponent(bin)}`);
        if (resWithBin.ok) {
          const jsonBin = await resWithBin.json().catch(() => []);
          const pm = Array.isArray(jsonBin) ? jsonBin[0] : jsonBin?.results?.[0];
          if (pm?.id) {
            return { id: pm.id, issuer_id: pm.issuer?.id ? String(pm.issuer.id) : undefined };
          }
        }
      }
    }

    // 2. Fallback local para as principais bandeiras se a API falhar
    // Isso garante que o pagamento pelo menos tente ser processado no servidor
    if (bin.startsWith("4")) return { id: "visa" };
    if (/^(5[1-5])/.test(bin)) return { id: "master" };
    if (/^(34|37)/.test(bin)) return { id: "amex" };
    if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363)/.test(bin)) return { id: "elo" };
    if (/^(6062|3841)/.test(bin)) return { id: "hipercard" };

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