import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MailRelayRequest {
  relayNonce?: string;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
  senderEmail?: string;
  senderName?: string;
  to?: string;
  subject?: string;
  html?: string;
}

function resolveBackendBaseUrl(): string {
  const apiEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  const derivedFromPublicApi =
    apiEnv && /^https?:\/\//i.test(apiEnv)
      ? apiEnv.replace(/\/api\/?$/, "").replace(/\/+$/, "")
      : "";
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    derivedFromPublicApi ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8888"
      : "https://notelagbe-backend.onrender.com")
  ).replace(/\/+$/, "");
}

function isDisallowedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isDisallowedIp(normalized.slice(7));
  }
  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map((n) => Number.parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(normalized)) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff")
    );
  }
  return true;
}

async function assertPublicSmtpHost(host: string): Promise<void> {
  const trimmed = host.trim();
  if (
    !trimmed ||
    trimmed.length > 180 ||
    /\s/.test(trimmed) ||
    trimmed.includes("://") ||
    trimmed.toLowerCase() === "localhost"
  ) {
    throw new Error("Invalid SMTP hostname.");
  }
  if (net.isIP(trimmed)) {
    if (isDisallowedIp(trimmed)) {
      throw new Error("Private or loopback SMTP addresses are not permitted.");
    }
    return;
  }
  const records = await dns.lookup(trimmed, { all: true });
  if (!records || records.length === 0) {
    throw new Error("Unable to resolve SMTP host.");
  }
  for (const record of records) {
    if (isDisallowedIp(record.address)) {
      throw new Error("Resolved SMTP address is not publicly routable.");
    }
  }
}

async function sendViaSmtpTransport(params: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = nodemailer.createTransport({
    host: params.host,
    port: params.port,
    secure: params.secure,
    auth: {
      user: params.username,
      pass: params.password,
    },
    connectionTimeout: 9000,
    greetingTimeout: 9000,
    socketTimeout: 12000,
  });

  return transporter.sendMail({
    from: params.from,
    replyTo: params.replyTo,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

function isRetryableConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code.toUpperCase() : "";
  const msg = typeof record.message === "string" ? record.message.toLowerCase() : "";
  return (
    code === "ETIMEDOUT" ||
    code === "ESOCKET" ||
    code === "ECONNREFUSED" ||
    msg.includes("timed out") ||
    msg.includes("econnrefused")
  );
}

export async function POST(request: NextRequest) {
  let body: MailRelayRequest;
  try {
    body = (await request.json()) as MailRelayRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const relayNonce = typeof body.relayNonce === "string" ? body.relayNonce.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject : "";
  const html = typeof body.html === "string" ? body.html : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const rawPassword = typeof body.password === "string" ? body.password.trim() : "";
  const senderEmail = typeof body.senderEmail === "string" ? body.senderEmail.trim() : username;
  const senderName = typeof body.senderName === "string" ? body.senderName.trim() : "NoteLagbe • Southeast University";
  const smtpHost = typeof body.smtpHost === "string" && body.smtpHost.trim() ? body.smtpHost.trim() : "smtp.gmail.com";
  const smtpPort = typeof body.smtpPort === "number" && Number.isInteger(body.smtpPort) ? body.smtpPort : 587;

  if (
    !relayNonce ||
    !to ||
    !to.includes("@") ||
    to.length > 254 ||
    !subject ||
    subject.length > 300 ||
    !html ||
    html.length > 500_000 ||
    !username ||
    username.length > 254 ||
    !rawPassword ||
    rawPassword.length > 450 ||
    smtpPort < 1 ||
    smtpPort > 65535
  ) {
    return NextResponse.json({ ok: false, error: "Missing or invalid email relay parameters." }, { status: 400 });
  }

  try {
    await assertPublicSmtpHost(smtpHost);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid SMTP host.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  // Verify single-use challenge nonce directly with trusted NoteLagbe backend
  const payloadHash = crypto
    .createHash("sha256")
    .update(`${to}\n${subject}\n${html}`, "utf8")
    .digest("hex");

  const backendBaseUrl = resolveBackendBaseUrl();
  try {
    const verifyRes = await fetch(`${backendBaseUrl}/api/auth/mail-relay-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relayNonce, payloadHash }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const verifyData = (await verifyRes.json().catch(() => null)) as { authorized?: boolean } | null;
    if (!verifyRes.ok || !verifyData?.authorized) {
      return NextResponse.json({ ok: false, error: "Unauthorized mail relay challenge." }, { status: 403 });
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not verify relay authorization with backend." },
      { status: 502 }
    );
  }

  const password = smtpHost.toLowerCase().includes("gmail.com")
    ? rawPassword.replace(/\s+/g, "")
    : rawPassword;
  const safeDisplayName = senderName.replace(/["\r\n]/g, "").trim();
  const formattedFrom = safeDisplayName ? `"${safeDisplayName}" <${senderEmail || username}>` : senderEmail || username;

  const mailParams = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    username,
    password,
    from: formattedFrom,
    replyTo: senderEmail || username,
    to,
    subject,
    html,
  };

  try {
    const info = await sendViaSmtpTransport(mailParams);
    return NextResponse.json({ ok: true, messageId: info.messageId || "" });
  } catch (firstErr) {
    if (smtpHost.toLowerCase().includes("gmail.com") && smtpPort === 587 && isRetryableConnectionError(firstErr)) {
      try {
        const retryInfo = await sendViaSmtpTransport({ ...mailParams, port: 465, secure: true });
        return NextResponse.json({ ok: true, messageId: retryInfo.messageId || "" });
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : "Gmail SMTP relay failed on port 465/587.";
        return NextResponse.json({ ok: false, error: msg }, { status: 502 });
      }
    }
    const msg = firstErr instanceof Error ? firstErr.message : "SMTP relay delivery failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
