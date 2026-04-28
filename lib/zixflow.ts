type ZixflowSendTemplateArgs = {
  to: string;
  template: string;
  variables?: Record<string, string>;
};

export function whatsappNumberFromUrl(url: string | null | undefined): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) return null;
  // Accept either a raw number or a wa.me / whatsapp URL containing digits.
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export async function zixflowSendTemplate(args: ZixflowSendTemplateArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = (process.env.ZIXFLOW_BASE_URL ?? "").trim().replace(/\/$/, "");
  const apiKey = (process.env.ZIXFLOW_API_KEY ?? "").trim();
  if (!base || !apiKey) {
    return { ok: false, error: "Missing ZIXFLOW_BASE_URL or ZIXFLOW_API_KEY" };
  }

  try {
    const r = await fetch(`${base}/v1/whatsapp/templates/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: args.to,
        template: args.template,
        variables: args.variables ?? {},
      }),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return { ok: false, error: `HTTP ${r.status}${text ? `: ${text.slice(0, 280)}` : ""}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Unknown error" };
  }
}

