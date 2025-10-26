// deno-lint-ignore-file no-explicit-any

const POSTMARK_API = "https://api.postmarkapp.com";
const token = Deno.env.get("POSTMARK_TOKEN");
if (!token) throw new Error("POSTMARK_TOKEN missing");

export async function sendEmail({
  to,
  subject,
  html,
  text,
  tag,
  stream = "outbound",
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  tag?: string;
  stream?: "outbound" | "broadcast";
}) {
  const response = await fetch(`${POSTMARK_API}/email`, {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: Deno.env.get("FROM_EMAIL") || "info@norrland-innovate.com",
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      Tag: tag,
      MessageStream: stream,
      ReplyTo: Deno.env.get("REPLY_TO") || "info@norrland-innovate.com",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Postmark error: ${error}`);
  }

  return response.json();
}

export async function sendWithTemplate<T extends Record<string, any>>(
  to: string,
  alias: string,
  model: T,
  stream: "outbound" | "broadcast" = "outbound"
) {
  const response = await fetch(`${POSTMARK_API}/email/withTemplate`, {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: Deno.env.get("FROM_EMAIL") || "info@norrland-innovate.com",
      To: to,
      TemplateAlias: alias,
      TemplateModel: model,
      MessageStream: stream,
      ReplyTo: Deno.env.get("REPLY_TO") || "info@norrland-innovate.com",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Postmark error: ${error}`);
  }

  return response.json();
}
