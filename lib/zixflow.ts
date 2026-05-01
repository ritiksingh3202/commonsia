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

export async function zixflowSendTemplate(args: ZixflowSendTemplateArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  const envBase = process.env.ZIXFLOW_BASE_URL?.trim();
  const base = (envBase && envBase.length > 0 ? envBase : DEFAULT_ZIXFLOW_BASE_URL).replace(/\/$/, "");
  const apiKey = (process.env.ZIXFLOW_API_KEY ?? "").trim();
  const phoneId = process.env.ZIXFLOW_WHATSAPP_PHONE_ID?.trim();

  if (!apiKey) {
    return { ok: false, error: "Missing ZIXFLOW_API_KEY" };
  }
  if (!phoneId) {
    return {
      ok: false,
      error:
        "Missing ZIXFLOW_WHATSAPP_PHONE_ID — copy Phone ID from Zixflow → Campaign → WhatsApp Settings (see send-whatsapp-message docs).",
    };
  }

  const language =
    args.language?.trim() ||
    process.env.ZIXFLOW_WHATSAPP_TEMPLATE_LANGUAGE?.trim() ||
    "en";

  const url = `${base}/api/v1/campaign/whatsapp/send`;

  try {
    const r = await fetch(url, {
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
    } catch {
      /* non-JSON error body */
    }

    if (!r.ok) {
      return {
        ok: false,
        error: `HTTP ${r.status}${text ? `: ${text.slice(0, 280)}` : ""}`,
      };
    }

    if (data && data.status === false) {
      return { ok: false, error: data.message?.trim() || "Zixflow returned status: false" };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Unknown error" };
  }
}
