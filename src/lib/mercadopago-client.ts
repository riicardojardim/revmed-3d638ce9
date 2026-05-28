// Browser-side helpers que falam direto com a API pública do Mercado Pago.
// Os dados de cartão NÃO passam pelo nosso servidor — vão do navegador
// para o MP, retornando apenas um token de uso único.

const MP = "https://api.mercadopago.com";

export async function getPaymentMethodFromBin(
  publicKey: string,
  bin: string,
): Promise<{ id: string; issuer_id?: string } | null> {
  try {
    const url = `${MP}/v1/payment_methods?public_key=${encodeURIComponent(publicKey)}&bin=${encodeURIComponent(bin)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json().catch(() => []);
      // API can return an array or an object with results
      const pm = Array.isArray(json) ? json[0] : (json?.results?.[0] || json);
      if (pm?.id) {
        return { id: pm.id, issuer_id: pm.issuer?.id ? String(pm.issuer.id) : undefined };
      }
    }
    
    // Fallback local para as principais bandeiras se a API falhar
    const digits = bin.replace(/\D/g, "");
    if (digits.startsWith("4")) return { id: "visa" };
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(digits)) return { id: "master" };
    if (/^(34|37)/.test(digits)) return { id: "amex" };
    if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|651|655)/.test(digits)) return { id: "elo" };
    if (/^(6062|3841|5067|4576|4011)/.test(digits)) return { id: "hipercard" };
    if (/^(6011|622|64|65)/.test(digits)) return { id: "discover" };
    if (/^(30[0-5]|36|38)/.test(digits)) return { id: "diners" };
    if (/^(352[89]|35[3-8][0-9])/.test(digits)) return { id: "jcb" };
    if (/^(60)/.test(digits)) return { id: "hipercard" };
    if (/^(50)/.test(digits)) return { id: "maestro" };

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