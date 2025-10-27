// supabase/functions/postmark-dispatch/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type QueueRow = {
  id: string;
  tenant_id: string;
  to_email: string;
  to_name: string | null;
  template_code: string;
  payload: Record<string, unknown>;
  attempts: number;
};

const POSTMARK_TOKEN = Deno.env.get("POSTMARK_TOKEN")!;
const POSTMARK_FROM = Deno.env.get("POSTMARK_FROM")!;
const POSTMARK_STREAM = Deno.env.get("POSTMARK_MESSAGE_STREAM") ?? "outbound";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sbFetch(path: string, init?: RequestInit) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      Prefer: "return=representation",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function fetchTemplate(code: string) {
  const res = await sbFetch(
    `email_templates?code=eq.${encodeURIComponent(code)}&limit=1`
  );
  const [tpl] = await res.json();
  return tpl as { subject: string; template_html?: string | null; postmark_template_id?: number | null };
}

function render(html: string, model: Record<string, unknown>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => String(model[k] ?? ""));
}

async function markStatus(
  id: string,
  status: "sending" | "sent" | "failed",
  meta?: unknown,
  currentAttempts = 0
) {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "sending") {
    patch.last_error = null;
    patch.scheduled_at = null;
  }

  if (status === "sent") {
    patch.sent_at = new Date().toISOString();
    patch.last_error = null;
  }

  if (status === "failed") {
    patch.last_error = typeof meta === "string" ? meta : JSON.stringify(meta ?? {});
    patch.attempts = currentAttempts + 1;
    
    if (currentAttempts + 1 >= 5) {
      patch.status = "cancelled";
    } else {
      const backoffMinutes = Math.min(60, Math.pow(currentAttempts + 1, 2));
      const scheduledAt = new Date(Date.now() + backoffMinutes * 60000);
      patch.scheduled_at = scheduledAt.toISOString();
    }
  }

  await sbFetch(`email_queue?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  await sbFetch(`email_events`, {
    method: "POST",
    body: JSON.stringify({
      queue_id: id,
      event: status,
      meta: typeof meta === "object" ? meta : (meta ? { error: meta } : {}),
    }),
  });
}

async function sendPostmark(row: QueueRow, tpl: any) {
  if (tpl?.postmark_template_id) {
    const payload = {
      From: POSTMARK_FROM,
      To: row.to_name ? `${row.to_name} <${row.to_email}>` : row.to_email,
      TemplateId: tpl.postmark_template_id,
      TemplateModel: { ...row.payload },
      MessageStream: POSTMARK_STREAM,
      Headers: [{ Name: "X-Queue-Id", Value: row.id }],
    };
    const res = await fetch("https://api.postmarkapp.com/email/withTemplate", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": POSTMARK_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Postmark template send failed: ${res.status} ${await res.text()}`);
    return;
  } else {
    const htmlBody = render(
      (tpl?.template_html as string) ?? "<p>Hello</p>",
      row.payload as any
    );
    const payload = {
      From: POSTMARK_FROM,
      To: row.to_name ? `${row.to_name} <${row.to_email}>` : row.to_email,
      Subject: tpl?.subject ?? "Notification",
      HtmlBody: htmlBody,
      MessageStream: POSTMARK_STREAM,
      Headers: [{ Name: "X-Queue-Id", Value: row.id }],
    };
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": POSTMARK_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Postmark raw send failed: ${res.status} ${await res.text()}`);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });

  console.log("[postmark-dispatch] Starting dispatch");

  const res = await sbFetch(`v_email_next`);
  const rows: QueueRow[] = await res.json();

  console.log(`[postmark-dispatch] Found ${rows?.length ?? 0} emails to send`);

  if (!rows?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });

  let processed = 0;
  for (const row of rows) {
    try {
      console.log(`[postmark-dispatch] Processing ${row.id} to ${row.to_email}`);
      await markStatus(row.id, "sending", undefined, row.attempts ?? 0);
      const tpl = await fetchTemplate(row.template_code);
      await sendPostmark(row, tpl);
      await markStatus(row.id, "sent", undefined, row.attempts ?? 0);
      processed++;
    } catch (e) {
      console.error(`[postmark-dispatch] Failed ${row.id}:`, e);
      await markStatus(row.id, "failed", String(e), row.attempts ?? 0);
    }
  }

  console.log(`[postmark-dispatch] Processed ${processed}/${rows.length}`);

  return new Response(JSON.stringify({ ok: true, processed }), { 
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
