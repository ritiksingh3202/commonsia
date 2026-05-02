/** Official REST API host ([Zixflow docs](https://docs.zixflow.com/api-reference/introduction)). Override with `ZIXFLOW_BASE_URL` if needed. */
const DEFAULT_ZIXFLOW_BASE_URL = "https://api.zixflow.com";

/**
 * WhatsApp template send — uses Campaign API per Zixflow docs:
 * {@link https://docs.zixflow.com/api-reference/campaign/whatsapp/send-whatsapp-message.md}
 *
 * `variables` keys must match your template (`body_1`, `body_2`, … from “Get Template Variables” in Zixflow).
 */

type ZixflowSendTemplateArgs = {
  to: string;
  /** Registered WhatsApp template name in Zixflow (same as `templateName` in their API). */
  template: string;
  variables?: Record<string, string>;
  /** Default `en`; use `en_US` etc. if your template requires it. */
  language?: string;
};

/**
 * Normalize profile WhatsApp (`wa.me/…`, `+91 …`, raw digits). Optional `ZIXFLOW_DEFAULT_COUNTRY_CODE`
 * (e.g. `91`) prepends when the value is exactly 10 digits (local India mobile).
 */
export function whatsappNumberFromUrl(url: string | null | undefined): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) return null;

  let digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;

  const cc = process.env.ZIXFLOW_DEFAULT_COUNTRY_CODE?.trim().replace(/\D/g, "");
  if (cc && digits.length === 10 && !digits.startsWith(cc)) {
    digits = `${cc}${digits}`;
  }

  return digits;
}

export type WhatsAppProfileFields = {
  whatsappUrl?: string | null;
  phone?: string | null;
};

/**
 * Resolve E.164-style digits for Zixflow: use profile WhatsApp (`whatsappUrl`), then fall back to `phone`.
 */
export function whatsappDigitsFromProfile(fields: WhatsAppProfileFields): string | null {
  const fromProfile = whatsappNumberFromUrl(fields.whatsappUrl);
  if (fromProfile) return fromProfile;
  return whatsappNumberFromUrl(fields.phone);
}

async function sendViaMetaWhatsApp(args: ZixflowSendTemplateArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() || process.env.ZIXFLOW_WHATSAPP_PHONE_ID?.trim();

  if (!accessToken) return { ok: false, error: "Missing META_WHATSAPP_ACCESS_TOKEN" };
  if (!phoneNumberId) return { ok: false, error: "Missing META_WHATSAPP_PHONE_NUMBER_ID" };

  const language = args.language?.trim() || process.env.ZIXFLOW_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";

  // Convert body_1, body_2, ... variables to Meta parameters array
  const vars = args.variables ?? {};
  const parameters = Object.keys(vars)
    .filter((k) => /^body_\d+$/.test(k))
    .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
    .map((k) => ({ type: "text", text: vars[k] }));

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: args.to,
    type: "template",
    template: {
      name: args.template,
      language: { code: language },
      ...(parameters.length > 0
        ? { components: [{ type: "body", parameters }] }
        : {}),
    },
  };

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const text = await r.text().catch(() => "");
    if (!r.ok) {
      return { ok: false, error: `Meta API HTTP ${r.status}: ${text.slice(0, 280)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Unknown error" };
  }
}

async function sendViaZixflow(args: ZixflowSendTemplateArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  const envBase = process.env.ZIXFLOW_BASE_URL?.trim();
  const base = (envBase && envBase.length > 0 ? envBase : DEFAULT_ZIXFLOW_BASE_URL).replace(/\/$/, "");
  const apiKey = (process.env.ZIXFLOW_API_KEY ?? "").trim();
  const phoneId = process.env.ZIXFLOW_WHATSAPP_PHONE_ID?.trim();

  if (!apiKey) return { ok: false, error: "Missing ZIXFLOW_API_KEY" };
  if (!phoneId) {
    return {
      ok: false,
      error: "Missing ZIXFLOW_WHATSAPP_PHONE_ID — copy Phone ID from Zixflow → Campaign → WhatsApp Settings.",
    };
  }

  const language = args.language?.trim() || process.env.ZIXFLOW_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";

  try {
    const r = await fetch(`${base}/api/v1/campaign/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: args.to,
        phoneId,
        templateName: args.template,
        language,
        variables: args.variables ?? {},
        submissionStatus: true,
      }),
    });

    const text = await r.text().catch(() => "");
    let data: { status?: boolean; message?: string } | null = null;
    try {
      data = text ? (JSON.parse(text) as { status?: boolean; message?: string }) : null;
    } catch { /* non-JSON */ }

    if (!r.ok) return { ok: false, error: `HTTP ${r.status}${text ? `: ${text.slice(0, 280)}` : ""}` };
    if (data && data.status === false) return { ok: false, error: data.message?.trim() || "Zixflow returned status: false" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Unknown error" };
  }
}

/**
 * Send a WhatsApp template message. Uses Meta Cloud API directly when
 * META_WHATSAPP_ACCESS_TOKEN is set; falls back to Zixflow otherwise.
 */
export async function zixflowSendTemplate(args: ZixflowSendTemplateArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.META_WHATSAPP_ACCESS_TOKEN?.trim()) {
    return sendViaMetaWhatsApp(args);
  }
  return sendViaZixflow(args);
}
