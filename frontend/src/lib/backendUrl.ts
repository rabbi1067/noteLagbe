/**
 * Resolves the normalized upstream Spring Boot origin (never ending with `/api` or `/`).
 */
export function resolveBackendBaseUrl(): string {
  const apiEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  const derivedFromPublicApi =
    apiEnv && /^https?:\/\//i.test(apiEnv)
      ? apiEnv.replace(/\/api\/?$/, "").replace(/\/+$/, "")
      : "";

  const candidates = [
    process.env.BACKEND_INTERNAL_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.BACKEND_URL,
    derivedFromPublicApi,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed)) {
      return trimmed.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    }
  }

  return process.env.NODE_ENV === "development"
    ? "http://localhost:8888"
    : "https://notelagbe-backend.onrender.com";
}
