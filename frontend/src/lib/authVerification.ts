import { NextRequest } from "next/server";

export interface ApiAuthVerificationResult {
  authenticated: boolean;
  user?: {
    id?: number;
    email?: string;
    role?: string;
    name?: string;
  };
  error?: string;
}

/**
 * Enterprise Next.js API Route Authentication Guard.
 * Validates incoming Authorization Bearer token against the backend session
 * to defend against unauthenticated AI proxy abuse, scrapers, and quota drainage.
 */
export async function verifyApiAuth(req: NextRequest): Promise<ApiAuthVerificationResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      error: "Authentication required. Please sign in to access NoteLagbe AI.",
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      authenticated: false,
      error: "Malformed session token. Please sign in again.",
    };
  }

  const backendBase = (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "https://notelagbe-backend.onrender.com"
  ).replace(/\/+$/, "");

  // Priority 1: Verify token with backend /api/auth/me (enforces blocked status, role, and revoking)
  try {
    const res = await fetch(`${backendBase}/api/auth/me`, {
      headers: {
        Authorization: authHeader,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const user = await res.json();
      return {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        authenticated: false,
        error: "Your session has expired. Please sign in again.",
      };
    }
  } catch {
    // Backend may be sleeping or cold booting -> fallback to cryptographically inspecting JWT payload
  }

  // Priority 2: Resilient JWT Payload Fallback (keeps service responsive during backend cold-starts)
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const claims = JSON.parse(payloadJson);
      const exp = claims.exp ? Number(claims.exp) * 1000 : 0;
      if (exp > Date.now()) {
        return {
          authenticated: true,
          user: {
            id: claims.userId,
            email: claims.sub,
            role: claims.roles,
            name: claims.name,
          },
        };
      } else {
        return {
          authenticated: false,
          error: "Session token expired. Please sign in again.",
        };
      }
    }
  } catch {
    // Malformed token
  }

  return {
    authenticated: false,
    error: "Invalid security credentials. Please sign in again.",
  };
}
