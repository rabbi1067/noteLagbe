export interface ChatMessageDto {
  id: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  senderAvatarUrl?: string | null;
  senderRole: string;
  messageType: "TEXT" | "VOICE" | "IMAGE";
  text?: string | null;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  voiceDuration?: number;
  replyToId?: number | null;
  replyToSender?: string | null;
  replyToText?: string | null;
  likesCount: number;
  likedByMe: boolean;
  pinned: boolean;
  pinnedAt?: string | null;
  pinExpiresAt?: string | null;
  createdAt: string;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const RAW_PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
  (process.env.NODE_ENV !== "development" ? "https://notelagbe-backend.onrender.com" : "");
const NORMALIZED_PUBLIC_BACKEND_API_URL =
  RAW_PUBLIC_BACKEND_URL && /^https?:\/\//i.test(RAW_PUBLIC_BACKEND_URL)
    ? `${RAW_PUBLIC_BACKEND_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "")}/api`
    : "";

/**
 * Resolves a direct Spring Boot `/api` origin when configured via static NEXT_PUBLIC_BACKEND_URL.
 * Used as cold-start fallback when the Vercel `/api` proxy returns 502/503/504 or times out,
 * and by EventSource to avoid pinning serverless lambdas.
 */
export function resolveDirectBackendApiUrl(): string | null {
  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    return API_BASE_URL.replace(/\/+$/, "");
  }
  if (!NORMALIZED_PUBLIC_BACKEND_API_URL) {
    return null;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalPage = hostname === "localhost" || hostname === "127.0.0.1";
    const pointsLocal =
      NORMALIZED_PUBLIC_BACKEND_API_URL.includes("localhost") ||
      NORMALIZED_PUBLIC_BACKEND_API_URL.includes("127.0.0.1");
    if (isLocalPage && !pointsLocal) {
      return null;
    }
    const explicitPublicBackend = Boolean(process.env.NEXT_PUBLIC_BACKEND_URL?.trim());
    const isTrustedCorsHost =
      hostname.endsWith(".vercel.app") || hostname.endsWith(".onrender.com");
    if (!explicitPublicBackend && !isTrustedCorsHost) {
      return null;
    }
  }
  return NORMALIZED_PUBLIC_BACKEND_API_URL;
}

const SAFE_COLD_START_RETRY_ENDPOINTS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/forgot-password",
  "/auth/verify-reset-code",
  "/auth/reset-password",
]);

const WARMUP_COOLDOWN_MS = 45_000;
let lastWarmupAt = 0;
let inFlightWarmup: Promise<boolean> | null = null;
let sawColdBackend = false;

function markBackendCold() {
  sawColdBackend = true;
}

function notifyBackendAwakeIfRecovered() {
  if (!sawColdBackend) return;
  sawColdBackend = false;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notelagbe:backend-awake"));
  }
}

/**
 * Pre-warms the backend with a non-blocking `/ping` call so Render Free Tier cold starts
 * begin before the user submits login or registration forms.
 */
export function warmupBackend(force = false): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (!force && Date.now() - lastWarmupAt < WARMUP_COOLDOWN_MS) {
    return Promise.resolve(true);
  }
  if (inFlightWarmup) {
    return inFlightWarmup;
  }

  const directBase = resolveDirectBackendApiUrl();
  const primaryBase = API_BASE_URL.replace(/\/+$/, "");
  const pingUrl = `${directBase || primaryBase}/ping`;

  inFlightWarmup = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(pingUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (res.ok) {
        lastWarmupAt = Date.now();
        notifyBackendAwakeIfRecovered();
        return true;
      }
      if (directBase && pingUrl !== `${primaryBase}/ping`) {
        const proxyRes = await fetch(`${primaryBase}/ping`, {
          method: "GET",
          cache: "no-store",
        });
        if (proxyRes.ok) {
          lastWarmupAt = Date.now();
          notifyBackendAwakeIfRecovered();
          return true;
        }
      }
      markBackendCold();
      return false;
    } catch {
      markBackendCold();
      return false;
    } finally {
      clearTimeout(timer);
      inFlightWarmup = null;
    }
  })();

  return inFlightWarmup;
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("notelagbe_token");
  if (!token) return null;
  if (isTokenExpired(token)) {
    removeToken();
    return null;
  }
  return token;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("notelagbe_token", token);
    localStorage.setItem("notelagbe_last_activity", String(Date.now()));
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("notelagbe_token");
    localStorage.removeItem("notelagbe_user");
    localStorage.removeItem("notelagbe_last_activity");
  }
}

export function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();

    const primaryBase = API_BASE_URL.replace(/\/+$/, "");
    const directBase = resolveDirectBackendApiUrl();
    const useDirectFirst = Boolean(directBase && primaryBase === "/api");
    const baseUrl = useDirectFirst ? directBase! : primaryBase;

    xhr.open("POST", `${baseUrl}${endpoint}`, true);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          onProgress(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      try {
        const text = xhr.responseText;
        const data = text ? JSON.parse(text) : {};
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as T);
        } else {
          const errMsg = data.bengaliMessage || data.message || data.error || `Upload failed (HTTP ${xhr.status})`;
          reject(new Error(errMsg));
        }
      } catch {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload. Please check your internet connection."));
    };

    xhr.ontimeout = () => {
      reject(new Error("File upload timed out. Please try again."));
    };
    xhr.timeout = 180_000;

    xhr.send(formData);
  });
}

// Anti-spam & double-click protection maps for mutating requests (POST, PUT, DELETE, PATCH)
const inFlightMutations = new Map<string, Promise<any>>();
const lastMutationTimestamps = new Map<string, number>();

// In-memory zero-latency cache & request deduplication for read-only GET calls
const clientGetCache = new Map<string, { data: any; expiry: number }>();
const inFlightGetRequests = new Map<string, Promise<any>>();

export function clearClientApiCache() {
  clientGetCache.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("notelagbe:sync-data", () => clearClientApiCache());
  window.addEventListener("notelagbe:session-expired", () => clearClientApiCache());
  window.addEventListener("notelagbe:account-blocked", () => clearClientApiCache());
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  let abortedByCaller = false;

  const onCallerAbort = () => {
    abortedByCaller = true;
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      onCallerAbort();
    } else {
      callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    if (!abortedByCaller) {
      controller.abort(new DOMException("Request timed out", "TimeoutError"));
    }
  }, timeoutMs);

  try {
    return await fetch(url, {
      cache: "no-store",
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    if (callerSignal) {
      callerSignal.removeEventListener("abort", onCallerAbort);
    }
  }
}

async function executeFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const method = (options.method || "GET").toUpperCase();
  const endpointPath = endpoint.split("?")[0];
  const isFormData = options.body instanceof FormData;
  const isAuthEndpoint = endpointPath.startsWith("/auth/");
  const canRetryOnColdStart =
    !isFormData &&
    (method === "GET" || method === "HEAD" || SAFE_COLD_START_RETRY_ENDPOINTS.has(endpointPath));

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const primaryBase = API_BASE_URL.replace(/\/+$/, "");
  const directBase = resolveDirectBackendApiUrl();
  // Public unauthenticated catalog endpoints (/courses, /teachers) have edge-cached Next.js
  // Route Handlers with a 2.5s bundled fallback, so avoid waiting 16s on a sleeping backend.
  const hasFastNextFallbackRoute =
    !token &&
    method === "GET" &&
    (endpointPath === "/courses" || endpointPath === "/teachers");
  // On deployed origins using "/api" rewrites, target the direct CORS backend origin first
  // so login/admin/authenticated requests bypass serverless proxy hops and reuse the warmed connection.
  const useDirectFirst = Boolean(directBase && primaryBase === "/api" && !hasFastNextFallbackRoute);
  const requestPrimaryBase = useDirectFirst ? directBase! : primaryBase;
  const requestFallbackBase = useDirectFirst
    ? primaryBase
    : directBase && directBase !== primaryBase
      ? directBase
      : primaryBase;
  const firstTimeoutMs = isFormData ? 120_000 : isAuthEndpoint ? 20_000 : 16_000;
  const retryTimeoutMs = isAuthEndpoint ? 30_000 : 24_000;
  const requestInit: RequestInit = {
    ...options,
    headers,
  };

  const emitWakingNotice = (attempt: number) => {
    markBackendCold();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notelagbe:backend-waking", {
          detail: { endpoint: endpointPath, attempt },
        })
      );
    }
  };

  let response: Response | null = null;
  let lastNetworkErr: unknown = null;

  try {
    response = await fetchWithTimeout(`${requestPrimaryBase}${endpoint}`, requestInit, firstTimeoutMs);
    if (
      canRetryOnColdStart &&
      (response.status === 502 || response.status === 503 || response.status === 504)
    ) {
      emitWakingNotice(2);
      if (requestFallbackBase === requestPrimaryBase) {
        await new Promise((r) => setTimeout(r, 600));
      }
      response = await fetchWithTimeout(`${requestFallbackBase}${endpoint}`, requestInit, retryTimeoutMs);
    }
  } catch (err: unknown) {
    lastNetworkErr = err;
    if (options.signal?.aborted) {
      throw err;
    }
    if (canRetryOnColdStart) {
      emitWakingNotice(2);
      try {
        if (requestFallbackBase === requestPrimaryBase) {
          await new Promise((r) => setTimeout(r, 600));
        }
        response = await fetchWithTimeout(`${requestFallbackBase}${endpoint}`, requestInit, retryTimeoutMs);
      } catch (retryErr: unknown) {
        lastNetworkErr = retryErr;
        response = null;
      }
    } else {
      markBackendCold();
    }
  }

  if (response && response.status < 500) {
    const dataSource = response.headers.get("X-Data-Source");
    if (dataSource !== "catalog-bundled" && dataSource !== "directory-bundled") {
      notifyBackendAwakeIfRecovered();
    }
  }

  if (!response) {
    const errName = lastNetworkErr instanceof Error || lastNetworkErr instanceof DOMException
      ? lastNetworkErr.name
      : "";
    const errMessage = lastNetworkErr instanceof Error || lastNetworkErr instanceof DOMException
      ? lastNetworkErr.message
      : "";
    const isTimeout =
      errName === "TimeoutError" ||
      errName === "AbortError" ||
      /timed out|timeout|abort/i.test(errMessage);
    throw new Error(
      isBanglaLocale()
        ? isTimeout
          ? "সার্ভার চালু হতে সময় নিচ্ছে বা সাড়া দিচ্ছে না। কয়েক সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।"
          : "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"
        : isTimeout
          ? "Server is waking up from idle sleep or taking too long to respond. Please wait a few seconds and try again."
          : "Unable to reach the server right now. Please check your connection and try again."
    );
  }

  if (!response.ok) {
    let errorMessage = "An error occurred";
    let errorCode = "";
    let isAccountBlocked = false;

    try {
      const errorData = await response.json();
      if (response.status === 429 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notelagbe:rate-limit-hit", { detail: { endpoint, ...errorData } }));
      }
      errorCode = errorData.code || "";
      isAccountBlocked = Boolean(
        errorData.blocked ||
          errorCode === "ACCOUNT_BLOCKED" ||
          errorData.error === "Account Blocked" ||
          errorData.error === "Account Suspended"
      );
      errorMessage = errorData.bengaliMessage || errorData.message || errorData.error || errorMessage;
    } catch {
      if (response.status === 429) {
        errorMessage = isBanglaLocale()
        ? "আপনি খুব দ্রুত ক্লিক করছেন, দয়া করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।"
        : "Too many requests! Please slow down and wait a moment before trying again.";
      } else {
        errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      }
    }

    if (typeof window !== "undefined") {
      const isAuthCredentialAttempt =
        endpoint.startsWith("/auth/login") ||
        endpoint.startsWith("/auth/google") ||
        endpoint.startsWith("/auth/forgot-password") ||
        endpoint.startsWith("/auth/reset-password");

      if (isAccountBlocked || (response.status === 403 && errorCode === "ACCOUNT_BLOCKED")) {
        const reason = Boolean(token) && !isAuthCredentialAttempt ? "auto_logout" : "login_denied";
        if (reason === "auto_logout") {
          removeToken();
        }
        window.dispatchEvent(
          new CustomEvent("notelagbe:account-blocked", {
            detail: { message: errorMessage, reason, code: "ACCOUNT_BLOCKED" },
          })
        );
      } else if (response.status === 401 && token && !isAuthCredentialAttempt) {
        removeToken();
        window.dispatchEvent(new Event("notelagbe:session-expired"));
      }
    }

    const err = new Error(errorMessage) as Error & { code?: string; status?: number; blocked?: boolean };
    err.code = errorCode || (isAccountBlocked ? "ACCOUNT_BLOCKED" : undefined);
    err.status = response.status;
    err.blocked = isAccountBlocked;
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

function isBanglaLocale(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("notelagbe_language") === "bn";
  } catch {
    return false;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  // Client-side double-click shield & mutation deduplication
  if (isMutation && typeof window !== "undefined") {
    // Invalidate client read cache on any data change
    clearClientApiCache();

    const now = Date.now();
    const lastTime = lastMutationTimestamps.get(endpoint) || 0;
    
    // Drop rapid clicks arriving within 350ms on the exact same endpoint
    if (now - lastTime < 350) {
      throw new Error(
        isBanglaLocale()
          ? "অতিরিক্ত ক্লিক করবেন না, দয়া করে এক মুহূর্ত অপেক্ষা করুন।"
          : "You are clicking too fast! Please wait a moment."
      );
    }
    lastMutationTimestamps.set(endpoint, now);

    // Lock in-flight request to deduplicate concurrent identical submissions
    const bodyStr = typeof options.body === "string" ? options.body : "";
    const mutationKey = `${method}:${endpoint}:${bodyStr}`;
    if (inFlightMutations.has(mutationKey)) {
      return inFlightMutations.get(mutationKey)!;
    }

    const promise = (async () => {
      try {
        return await executeFetch<T>(endpoint, options);
      } finally {
        inFlightMutations.delete(mutationKey);
      }
    })();

    inFlightMutations.set(mutationKey, promise);
    return promise;
  }

  // Zero-latency in-memory cache & request deduplication for read-only GET calls
  if (method === "GET") {
    const token = getToken();
    const isCacheable =
      endpoint.startsWith("/courses") ||
      endpoint.startsWith("/teachers") ||
      endpoint.startsWith("/resources/course") ||
      endpoint.startsWith("/resources/teacher") ||
      endpoint.startsWith("/reviews/course") ||
      endpoint.startsWith("/reviews/teacher") ||
      endpoint.startsWith("/notices");

    const cacheKey = `${token ? "auth" : "guest"}:${endpoint}`;

    if (isCacheable && typeof window !== "undefined") {
      const cached = clientGetCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return Promise.resolve(cached.data as T);
      }
    }

    // Deduplicate in-flight concurrent requests for the exact same GET
    if (inFlightGetRequests.has(cacheKey)) {
      return inFlightGetRequests.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const result = await executeFetch<T>(endpoint, options);
        if (isCacheable && typeof window !== "undefined") {
          clientGetCache.set(cacheKey, { data: result, expiry: Date.now() + 30000 });
        }
        return result;
      } finally {
        inFlightGetRequests.delete(cacheKey);
      }
    })();

    inFlightGetRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  return executeFetch<T>(endpoint, options);
}

async function downloadAuthorizedBlob(
  endpoint: string,
  fallbackFilename: string,
  defaultError: string
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetchWithTimeout(
    `${API_BASE_URL}${endpoint}`,
    { headers },
    45_000
  );
  if (!response.ok) {
    let errorMsg = defaultError;
    try {
      const errData = await response.json();
      errorMsg = errData.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(disposition);
  const resolvedName = match?.[1]
    ? decodeURIComponent(match[1].replace(/"/g, "").trim())
    : fallbackFilename;
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = resolvedName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export const api = {
  // Auth API
  auth: {
    login: (data: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    googleLogin: (data: any) => request<any>("/auth/google", { method: "POST", body: JSON.stringify(data) }),
    logout: () => request<any>("/auth/logout", { method: "POST" }),
    getMe: () => request<any>("/auth/me"),
    updateProfile: (data: { name?: string; phone?: string; address?: string; avatarUrl?: string | null }) =>
      request<any>("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; avatarUrl: string; message: string }>("/auth/avatar/upload", {
        method: "POST",
        body: formData,
      });
    },
    removeAvatar: () => request<{ success: boolean; avatarUrl: string; message: string }>("/auth/avatar", { method: "DELETE" }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<any>("/auth/password", { method: "PUT", body: JSON.stringify(data) }),
    forgotPassword: (email: string) =>
      request<{
        success: boolean;
        codeSent: boolean;
        email: string;
        expiresInSeconds?: number;
        resendCooldownSeconds?: number;
        message: string;
      }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    verifyResetCode: (data: { email: string; code: string }) =>
      request<{
        success: boolean;
        verified: boolean;
        email: string;
        resetToken: string;
        expiresInSeconds?: number;
        message: string;
      }>("/auth/verify-reset-code", { method: "POST", body: JSON.stringify(data) }),
    resetPassword: (data: { email: string; resetToken: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Courses API
  courses: {
    getAll: (params?: { query?: string; semester?: number; electiveGroup?: string; department?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.query) searchParams.set("query", params.query);
      if (params?.semester) searchParams.set("semester", params.semester.toString());
      if (params?.electiveGroup) searchParams.set("electiveGroup", params.electiveGroup);
      if (params?.department) searchParams.set("department", params.department);
      const queryString = searchParams.toString();
      return request<any[]>(`/courses${queryString ? `?${queryString}` : ""}`);
    },
    getByCode: (code: string) => request<any>(`/courses/${code}`),
    unlock: (code: string) => request<any>(`/courses/${code}/unlock`, { method: "POST" }),
    getCheatSheet: (code: string) => request<any>(`/courses/${code}/cheatsheet`),
    downloadZip: (code: string) =>
      Promise.reject(
        new Error(
          "For security purposes, the offline study pack (ZIP) download service is temporarily disabled. Please view materials directly on NoteLagbe."
        )
      ),
  },

  // Teachers API
  teachers: {
    getAll: (params?: { category?: string; query?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set("category", params.category);
      if (params?.query) searchParams.set("query", params.query);
      const queryString = searchParams.toString();
      return request<any[]>(`/teachers${queryString ? `?${queryString}` : ""}`);
    },
    getById: (id: number) => request<any>(`/teachers/${id}`),
    getCourses: (id: number) => request<any[]>(`/teachers/${id}/courses`),
    syncCse: () =>
      request<{
        status: string;
        sourceUrl: string;
        department: string;
        totalOfficialScraped: number;
        updated: number;
        added: number;
        unchanged: number;
        timestamp: string;
      }>("/teachers/sync-cse", { method: "POST" }),
  },

  // Resources API
  resources: {
    getByCourse: (code: string) => request<any[]>(`/resources/course/${code}`),
    getByTeacher: (teacherId: number) => request<any[]>(`/resources/teacher/${teacherId}`),
    getById: (id: number) => request<any>(`/resources/${id}`),
    downloadFile: (id: number, fallbackFilename = `material_${id}.pdf`) =>
      downloadAuthorizedBlob(
        `/resources/${id}/file?download=true`,
        fallbackFilename,
        "Failed to download study material"
      ),
    trackDownload: (id: number) => request<any>(`/resources/${id}/download`, { method: "POST" }),
    checkAvailability: (courseCode: string, teacherId?: number) => {
      const sp = new URLSearchParams();
      sp.set("courseCode", courseCode);
      if (teacherId) sp.set("teacherId", teacherId.toString());
      return request<{
        available: boolean;
        courseId?: number;
        courseCode: string;
        courseTitle: string;
        teacherId?: number;
        teacherName: string;
        notesCount: number;
        questionsCount: number;
        totalCount: number;
        message: string;
      }>(`/resources/check-availability?${sp.toString()}`);
    },
    checkDuplicate: (params: {
      courseCode: string;
      teacherId?: number | null;
      type?: string;
      semesterName?: string;
      title?: string;
      excludeId?: number | null;
    }) => {
      const sp = new URLSearchParams();
      sp.set("courseCode", params.courseCode);
      if (params.teacherId !== undefined && params.teacherId !== null && params.teacherId > 0) {
        sp.set("teacherId", params.teacherId.toString());
      }
      if (params.type) sp.set("type", params.type);
      if (params.semesterName) sp.set("semesterName", params.semesterName);
      if (params.title) sp.set("title", params.title);
      if (params.excludeId) sp.set("excludeId", params.excludeId.toString());
      return request<{
        duplicate: boolean;
        normalizedSemester: string;
        singleSlotExam: boolean;
        existingResourceId?: number;
        existingTitle?: string;
        existingType?: string;
        existingSemester?: string;
        existingStatus?: string;
        existingCourseCode?: string;
        existingTeacherName?: string;
        message: string | null;
      }>(`/resources/check-duplicate?${sp.toString()}`);
    },
    getDuplicateSlots: (courseCode: string) =>
      request<{
        courseCode: string;
        items: Array<{
          id: number;
          title: string;
          titleKey: string;
          type: string;
          semesterName: string;
          normalizedSemester: string;
          semesterKey: string;
          status: string;
          courseCode: string;
          teacherId: number | null;
          teacherName: string | null;
          singleSlotExam: boolean;
        }>;
      }>(`/resources/duplicate-slots?courseCode=${encodeURIComponent(courseCode.trim())}`),
  },

  // Payments API
  payments: {
    submit: (data: any) => request<any>("/payments/submit", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request<any[]>("/payments/my"),
  },

  // Contributions API
  contributions: {
    submit: (data: any) => request<any>("/contributions/submit", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request<any[]>("/contributions/my"),
    verifyLink: (url: string) => request<any>(`/contributions/verify-link?url=${encodeURIComponent(url)}`),
      getLeaderboard: () => request<any[]>('/contributions/leaderboard'),
    uploadFile: (
      file: File,
      onProgress?: (percent: number, loaded: number, total: number) => void
    ) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadWithProgress<{ success: boolean; url: string; fileName: string; fileSize: string; fileType: string; message: string }>(
        "/contributions/upload",
        formData,
        onProgress
      );
    },
  },

  // Waivers API
  waivers: {
    submit: (data: any) => request<any>("/waivers/submit", { method: "POST", body: JSON.stringify(data) }),
    getMy: () => request<any[]>("/waivers/my"),
  },

  // Notices & Announcements API
  notices: {
    getActive: () => request<any[]>("/notices"),
  },

  // Reviews API
  reviews: {
    submit: (data: any) => request<any>("/reviews/submit", { method: "POST", body: JSON.stringify(data) }),
    check: (courseCode: string) => request<{ hasReviewed: boolean }>(`/reviews/check?courseCode=${courseCode}`),
    getByCourse: (code: string) => request<any[]>(`/reviews/course/${code}`),
    getByTeacher: (teacherId: number) => request<any[]>(`/reviews/teacher/${teacherId}`),
    getRecent: () => request<any[]>("/reviews/recent"),
  },

  // Plans API
  plans: {
    getAll: () => request<any[]>("/plans"),
  },

  // Admin API
  admin: {
    getStats: () => request<any>("/admin/stats"),
    getAnalytics: () => request<any>("/admin/analytics"),

    // Resource Management
    getResources: () => request<any[]>("/admin/resources"),
    uploadMaterialFile: (
      file: File,
      onProgress?: (percent: number, loaded: number, total: number) => void
    ) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadWithProgress<{ success: boolean; url: string; fileName: string; fileSize: string; fileType: string; message: string }>(
        "/admin/resources/upload",
        formData,
        onProgress
      );
    },
    createResource: (data: any) => request<any>("/admin/resources", { method: "POST", body: JSON.stringify(data) }),
    updateResource: (id: number, data: any) => request<any>(`/admin/resources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateResourceFile: (id: number, fileUrl: string) =>
      request<any>(`/admin/resources/${id}/file`, {
        method: "PATCH",
        body: JSON.stringify({ fileUrl }),
      }),
    deleteResource: (id: number) => request<any>(`/admin/resources/${id}`, { method: "DELETE" }),

    // Course Management & Assignments
    createCourse: (data: any) =>
      request<any>("/admin/courses", { method: "POST", body: JSON.stringify(data) }),
    updateCourse: (code: string, data: any) =>
      request<any>(`/admin/courses/${code}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCourse: (code: string) =>
      request<any>(`/admin/courses/${code}`, { method: "DELETE" }),
    assignTeacherToCourse: (code: string, teacherId: number) =>
      request<any>(`/admin/courses/${code}/teachers/${teacherId}`, { method: "POST" }),
    removeTeacherFromCourse: (code: string, teacherId: number) =>
      request<any>(`/admin/courses/${code}/teachers/${teacherId}`, { method: "DELETE" }),

    // Faculty Directory Management
    createTeacher: (data: any) =>
      request<any>("/admin/teachers", { method: "POST", body: JSON.stringify(data) }),
    updateTeacher: (id: number, data: any) =>
      request<any>(`/admin/teachers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteTeacher: (id: number) =>
      request<any>(`/admin/teachers/${id}`, { method: "DELETE" }),
    uploadTeacherPhoto: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; url: string; message: string }>("/admin/teachers/upload-photo", {
        method: "POST",
        body: formData,
      });
    },

    // Staff Management
    getStaff: () => request<any[]>("/admin/staff"),
    createStaff: (data: any) => request<any>("/admin/staff", { method: "POST", body: JSON.stringify(data) }),
    updateStaff: (id: number, data: any) => request<any>(`/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    toggleStaffStatus: (id: number) => request<any>(`/admin/staff/${id}/toggle-status`, { method: "PUT" }),
    deleteStaff: (id: number) => request<any>(`/admin/staff/${id}`, { method: "DELETE" }),
    giftCourseToStudent: (userId: number, data: { courseCode: string; teacherId: number; validityMonths?: number | null; note?: string }) =>
      request<any>(`/admin/users/${userId}/gift-course`, { method: "POST", body: JSON.stringify(data) }),
    getStudentUnlockedCourses: (userId: number) => request<any[]>(`/admin/users/${userId}/unlocked-courses`),
    revokeStudentUnlockedCourse: (userId: number, courseId: number, unlockId?: number, teacherId?: number) => {
      const params = new URLSearchParams();
      if (unlockId !== undefined && unlockId !== null) params.set("unlockId", String(unlockId));
      if (teacherId !== undefined && teacherId !== null) params.set("teacherId", String(teacherId));
      const qs = params.toString();
      return request<any>(`/admin/users/${userId}/unlocked-courses/${courseId}${qs ? `?${qs}` : ""}`, { method: "DELETE" });
    },

    // Payments & Subscriptions
    getPayments: (status?: string) => request<any[]>(`/admin/payments${status ? `?status=${status}` : ""}`),
    approvePayment: (id: number, notes?: string) =>
      request<any>(`/admin/payments/${id}/approve`, { method: "POST", body: JSON.stringify({ notes }) }),
    rejectPayment: (id: number, notes?: string) =>
      request<any>(`/admin/payments/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),
    getSubscriptions: (active?: boolean) =>
      request<any[]>(`/admin/subscriptions${active !== undefined ? `?active=${active}` : ""}`),

    // Contributions
    getContributions: (status?: string) => request<any[]>(`/admin/contributions${status ? `?status=${status}` : ""}`),
    approveContribution: (id: number, data?: { feedback?: string; title?: string; teacherId?: number | null; resourceType?: string; semesterName?: string; courseCode?: string; department?: string } | string) => {
      const body = typeof data === "string" ? { feedback: data } : (data || {});
      return request<any>(`/admin/contributions/${id}/approve`, { method: "POST", body: JSON.stringify(body) });
    },
    rejectContribution: (id: number, feedback?: string) =>
      request<any>(`/admin/contributions/${id}/reject`, { method: "POST", body: JSON.stringify({ feedback }) }),
    deleteContribution: (id: number) =>
      request<any>(`/admin/contributions/${id}`, { method: "DELETE" }),

    // Waivers
    getWaivers: (status?: string) => request<any[]>(`/admin/waivers${status ? `?status=${status}` : ""}`),
    approveWaiver: (id: number, grantedCoursesCount: number, notes?: string) =>
      request<any>(`/admin/waivers/${id}/approve`, { method: "POST", body: JSON.stringify({ grantedCoursesCount, notes }) }),
    rejectWaiver: (id: number, notes?: string) =>
      request<any>(`/admin/waivers/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),

    // Campus Notices & Announcements
    getNotices: () => request<any[]>("/admin/notices"),
    createNotice: (data: any) => request<any>("/admin/notices", { method: "POST", body: JSON.stringify(data) }),
    updateNotice: (id: number, data: any) => request<any>(`/admin/notices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteNotice: (id: number) => request<any>(`/admin/notices/${id}`, { method: "DELETE" }),
    toggleNoticeStatus: (id: number) => request<any>(`/admin/notices/${id}/toggle-status`, { method: "PUT" }),

    // Security & Activity Logs (All Admins)
    getActivityLogs: (params?: { page?: number; size?: number; search?: string; actionType?: string }) => {
      const q = new URLSearchParams();
      if (params?.page !== undefined) q.set("page", params.page.toString());
      if (params?.size !== undefined) q.set("size", params.size.toString());
      if (params?.search) q.set("search", params.search);
      if (params?.actionType && params.actionType !== "ALL") q.set("actionType", params.actionType);
      return request<any>(`/admin/activity-logs?${q.toString()}`);
    },
    clearActivityLogs: (password: string) =>
      request<any>("/admin/activity-logs/clear", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),

    // Reviews Moderation
    getReviews: (status?: string) => request<any[]>(status ? `/admin/reviews?status=${status}` : "/admin/reviews"),
    approveReview: (id: number) => request<any>(`/admin/reviews/${id}/approve`, { method: "POST" }),
    rejectReview: (id: number) => request<any>(`/admin/reviews/${id}/reject`, { method: "POST" }),
    deleteReview: (id: number) => request<any>(`/admin/reviews/${id}`, { method: "DELETE" }),

    // Settings & Profile
    getSettings: () =>
      request<{
        emailNotificationsEnabled: boolean;
        smtpConfigured: boolean;
        provider?: "VERCEL_RELAY" | "APPS_SCRIPT" | "SMTP" | "BREVO" | "RESEND" | string;
        smtpSender: string;
        senderEmail?: string;
        senderName?: string;
        smtpHost: string;
        rawSmtpHost?: string;
        smtpPort?: number;
        webhookUrl?: string;
        hasSecret?: boolean;
        secretPreview?: string;
        credentialSource?: string;
        statusMessage: string;
      }>("/admin/settings"),
    saveEmailConfig: (data: {
      provider: string;
      senderEmail: string;
      senderName?: string;
      smtpHost?: string;
      smtpPort?: number;
      webhookUrl?: string;
      secret?: string;
      clearSavedConfig?: boolean;
    }) =>
      request<{
        emailNotificationsEnabled: boolean;
        smtpConfigured: boolean;
        provider: string;
        smtpSender: string;
        senderEmail: string;
        senderName: string;
        smtpHost: string;
        rawSmtpHost: string;
        smtpPort: number;
        webhookUrl: string;
        hasSecret: boolean;
        secretPreview: string;
        credentialSource: string;
        statusMessage: string;
      }>("/admin/settings/email-config", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    toggleEmail: (enabled: boolean) =>
      request<{ success: boolean; emailNotificationsEnabled: boolean }>("/admin/settings/email-toggle", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),
    sendTestEmail: (recipientEmail?: string) =>
      request<{ success: boolean; message: string }>("/admin/settings/send-test-email", {
        method: "POST",
        body: JSON.stringify({ recipientEmail }),
      }),
    getProfile: () => request<any>("/admin/profile"),
    updateProfile: (data: { name: string; phone?: string; address?: string; avatarUrl?: string | null }) =>
      request<any>("/admin/profile", { method: "PUT", body: JSON.stringify(data) }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ success: boolean; avatarUrl: string; message: string }>("/admin/avatar/upload", {
        method: "POST",
        body: formData,
      });
    },
    removeAvatar: () => request<{ success: boolean; avatarUrl: string; message: string }>("/admin/avatar", { method: "DELETE" }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<any>("/admin/password", { method: "PUT", body: JSON.stringify(data) }),
    // Live Chat Moderation
    deleteChatMessage: (id: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/messages/${id}`, { method: "DELETE" }),
    pinChatMessage: (id: number) =>
      request<ChatMessageDto>(`/admin/chat/messages/${id}/pin`, { method: "POST" }),
    unpinChatMessage: (id: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/messages/${id}/unpin`, { method: "POST" }),
    blockUserFromChat: (userId: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/users/${userId}/block`, { method: "POST" }),
    unblockUserFromChat: (userId: number) =>
      request<{ success: boolean; message: string }>(`/admin/chat/users/${userId}/unblock`, { method: "POST" }),
    getChatRetention: () =>
      request<{
        retentionDays: number;
        defaultRetentionDays: number;
        minRetentionDays: number;
        maxRetentionDays: number;
        allowedOptions: number[];
        totalActiveMessages: number;
        softDeletedMessages: number;
        messagesDueForPurge: number;
        oldestMessageAt: string | null;
      }>("/admin/chat/retention"),
    updateChatRetention: (retentionDays: number) =>
      request<{
        retentionDays: number;
        defaultRetentionDays: number;
        minRetentionDays: number;
        maxRetentionDays: number;
        allowedOptions: number[];
        totalActiveMessages: number;
        softDeletedMessages: number;
        messagesDueForPurge: number;
        oldestMessageAt: string | null;
      }>("/admin/chat/retention", {
        method: "PUT",
        body: JSON.stringify({ retentionDays }),
      }),
    purgeOldChatMessages: (olderThanDays?: number) =>
      request<{
        success: boolean;
        purgedCount: number;
        filesDeleted: number;
        olderThanDays: number;
        cutoff: string;
        message: string;
      }>("/admin/chat/purge", {
        method: "POST",
        body: JSON.stringify(olderThanDays !== undefined ? { olderThanDays } : {}),
      }),
  },

  // Community Live Chat API
  chat: {
    getMessages: () => request<ChatMessageDto[]>("/chat/messages"),
    getPinned: () => request<ChatMessageDto | null>("/chat/pinned"),
    getActiveCount: () => request<{ activeCount: number; status: string }>("/chat/active-count"),
    sendMessage: (data: { text: string; replyToId?: number; replyToSender?: string; replyToText?: string }) =>
      request<ChatMessageDto>("/chat/messages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sendVoice: (formData: FormData) =>
      request<ChatMessageDto>("/chat/voice", {
        method: "POST",
        body: formData,
      }),
    sendImage: (formData: FormData) =>
      request<ChatMessageDto>("/chat/image", {
        method: "POST",
        body: formData,
      }),
    toggleLike: (id: number) =>
      request<ChatMessageDto>(`/chat/messages/${id}/like`, {
        method: "POST",
      }),
  },

  // Notifications API
  notifications: {
    getMy: () => request<any[]>("/notifications"),
    getUnreadCount: () => request<{ unreadCount: number }>("/notifications/unread-count"),
    markAsRead: (id: number) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: "POST" }),
    markAllAsRead: () => request<{ success: boolean }>("/notifications/read-all", { method: "POST" }),
    delete: (id: number) => request<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" }),
    clearAll: () => request<{ success: boolean }>("/notifications/clear-all", { method: "DELETE" }),
  },

  // Demo API
  demo: {
    getStatus: () => request<any>("/demo/status"),
  },

  // Platform Public Stats & Visitor Tracking
  stats: {
    getPublic: () => request<{ totalViews: number; activeNow: number; status: string }>("/stats/public"),
    recordVisit: () => request<{ totalViews: number; activeNow: number; status: string }>("/stats/visit", { method: "POST" }),
  },

  // AI Exam Revision Cheat Sheet & Chatbot API (Powered by Gemini)
  aiExamChat: {
    getMessages: (courseCode: string) =>
      request<any[]>(`/ai/exam-chat/messages?courseCode=${encodeURIComponent(courseCode)}`),
    sendMessage: (data: { courseCode: string; message: string; teacherId?: number | null }) =>
      request<any>("/ai/exam-chat/send", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    clearMessages: (courseCode: string) =>
      request<{ success: boolean; message: string }>(
        `/ai/exam-chat/messages?courseCode=${encodeURIComponent(courseCode)}`,
        { method: "DELETE" }
      ),
  },
};
