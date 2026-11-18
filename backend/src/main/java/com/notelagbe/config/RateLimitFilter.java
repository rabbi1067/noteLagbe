package com.notelagbe.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enterprise Rate Limiting & Rapid-Click Shield Filter
 * 1. Rapid Mutation Burst Guard: Drops duplicate mutating requests (POST, PUT, DELETE, PATCH)
 *    within < 350ms per client IP + endpoint to prevent double-clicks and button spamming.
 * 2. Multi-Tier Token Bucket Algorithm (Bucket4j):
 *    - Auth Tier (Login / Register): 15 attempts / min
 *    - Review Tier (/api/reviews): 10 evaluations / min
 *    - Payment Tier (/api/payments): 8 submissions / min
 *    - Financial Waiver Tier (/api/waivers): 10 submissions / min
 *    - Contribution Tier (/api/contributions): 15 submissions / min
 *    - Live Chat Tier (/api/chat): 30 messages / min
 *    - Sync Tier (/api/teachers/sync-cse): 5 requests / min
 *    - General High-Throughput API: 240 requests / min
 * 3. Returns HTTP 429 Too Many Requests with informative English & Bengali messages.
 */
@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.notelagbe.security.JwtTokenProvider tokenProvider;

    // Multi-tier bucket maps with endpoint classification
    private final Map<String, BucketEntry> buckets = new ConcurrentHashMap<>();
    
    // Rapid mutation cooldown map to shield against double-clicking and spam clicking
    private final Map<String, Long> lastMutationTimes = new ConcurrentHashMap<>();

    private static class BucketEntry {
        final Bucket bucket;
        long lastAccessTime;

        BucketEntry(Bucket bucket) {
            this.bucket = bucket;
            this.lastAccessTime = System.currentTimeMillis();
        }
    }

    private Bucket createBucketForPath(String path) {
        Bandwidth limit;

        if (path.startsWith("/api/auth/forgot-password") ||
            path.startsWith("/api/auth/verify-reset-code") ||
            path.startsWith("/api/auth/reset-password")) {
            // Strict recovery tier: 8 attempts / min (prevents email enumeration & OTP brute force)
            limit = Bandwidth.builder().capacity(8).refillGreedy(8, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) {
            // Strict tier: 15 attempts / min (brute force protection)
            limit = Bandwidth.builder().capacity(15).refillGreedy(15, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/reviews")) {
            // Review tier: 10 evaluations / min (anti-spam protection)
            limit = Bandwidth.builder().capacity(10).refillGreedy(10, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/payments")) {
            // Payment tier: 8 submissions / min (anti-fraud protection)
            limit = Bandwidth.builder().capacity(8).refillGreedy(8, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/waivers")) {
            // Financial waiver tier: 10 submissions / min
            limit = Bandwidth.builder().capacity(10).refillGreedy(10, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/chat/messages") || path.startsWith("/api/chat")) {
            // Chat tier: 30 messages / min (anti-spam protection)
            limit = Bandwidth.builder().capacity(30).refillGreedy(30, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/ai")) {
            // AI Exam Chat tier: 25 requests / min
            limit = Bandwidth.builder().capacity(25).refillGreedy(25, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/contributions")) {
            // Mutation tier: 15 submissions / min
            limit = Bandwidth.builder().capacity(15).refillGreedy(15, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/teachers/sync-cse")) {
            // Intensive sync tier: 5 requests / min
            limit = Bandwidth.builder().capacity(5).refillGreedy(5, Duration.ofMinutes(1)).build();
        } else {
            // General high-throughput API tier: 240 requests / min
            limit = Bandwidth.builder().capacity(240).refillGreedy(240, Duration.ofMinutes(1)).build();
        }

        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Whitelist static files, h2 console, uploads, SSE sync streams, mail-relay challenge callbacks, and admin read analytics
        if (path.startsWith("/h2-console") ||
            path.startsWith("/static") ||
            path.startsWith("/uploads") ||
            path.startsWith("/api/sync") ||
            "/api/auth/mail-relay-verify".equals(path) ||
            (path.startsWith("/api/admin") && "GET".equalsIgnoreCase(method))) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        // Role-based Rate Limit Exemption for Administrative Staff
        // Admins and Managers uploading multiple notes, questions, or performing bulk administrative tasks
        // are completely exempt from rapid mutation shields and rate limiting throttles.
        if (isAdminOrStaff(request)) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        String clientIp = getClientIP(request);

        // 1. Rapid Mutation Burst Guard (< 350ms anti-rapid-click shield)
        // Protects against user spam-clicking submit buttons or double-clicking forms
        boolean isMutation = "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) ||
                             "DELETE".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method);

        if (isMutation) {
            String burstKey = clientIp + ":" + method + ":" + path;
            long now = System.currentTimeMillis();
            Long lastTime = lastMutationTimes.put(burstKey, now);
            if (lastTime != null && (now - lastTime) < 350) {
                response.setStatus(429);
                response.setHeader("Retry-After", "1");
                response.setHeader("X-RateLimit-Remaining", "0");
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                        "{\"status\": 429, \"error\": \"Too Many Requests\", \"message\": \"You are clicking too fast! Please slow down and wait a moment before trying again.\", \"bengaliMessage\": \"আপনি খুব দ্রুত ক্লিক করছেন! দয়া করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।\", \"retryAfterSeconds\": 1}"
                );
                log.warn("[RateLimit-Burst] Blocked rapid burst clicks: ip={}, method={}, path={}, deltaMs={}", clientIp, method, path, (now - lastTime));
                return;
            }
        }

        // 2. Direct loopback GET exemption to keep local Next.js HMR & SSR fast in development
        // Uses actual socket remoteAddr (never spoofable X-Forwarded-For)
        String remoteAddr = request.getRemoteAddr();
        boolean isLocal = "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr);
        if (isLocal && !isMutation) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        // 3. Multi-tier Token Bucket Enforcement
        if (buckets.size() > 25_000) {
            cleanupIdleBuckets();
        }
        String tierKey = getTierKey(path);
        String bucketKey = clientIp + ":" + tierKey;

        BucketEntry entry = buckets.compute(bucketKey, (k, old) -> {
            if (old == null) {
                return new BucketEntry(createBucketForPath(path));
            }
            old.lastAccessTime = System.currentTimeMillis();
            return old;
        });

        ConsumptionProbe probe = entry.bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            long waitForRefillNanos = probe.getNanosToWaitForRefill();
            long waitForRefillSeconds = Math.max(1, waitForRefillNanos / 1_000_000_000L);

            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(waitForRefillSeconds));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(String.format(
                    "{\"status\": 429, \"error\": \"Too Many Requests\", \"message\": \"Rate limit exceeded. Please wait %d seconds before trying again.\", \"bengaliMessage\": \"অনুরোধের সীমা অতিক্রম করেছে। দয়া করে %d সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।\", \"retryAfterSeconds\": %d}",
                    waitForRefillSeconds, waitForRefillSeconds, waitForRefillSeconds
            ));
            log.warn("[RateLimit] Throttled client: ip={}, path={}, tier={}, wait={}s", clientIp, path, tierKey, waitForRefillSeconds);
        }
    }

    private String getTierKey(String path) {
        if (path.startsWith("/api/auth/forgot-password") ||
            path.startsWith("/api/auth/verify-reset-code") ||
            path.startsWith("/api/auth/reset-password")) {
            return "auth_reset";
        }
        if (path.startsWith("/api/auth")) return "auth";
        if (path.startsWith("/api/reviews")) return "reviews";
        if (path.startsWith("/api/payments")) return "payments";
        if (path.startsWith("/api/waivers")) return "waivers";
        if (path.startsWith("/api/chat")) return "chat";
        if (path.startsWith("/api/contributions")) return "contrib";
        if (path.startsWith("/api/teachers/sync-cse")) return "sync";
        return "general";
    }

    private boolean isAdminOrStaff(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ") && tokenProvider != null) {
            String token = authHeader.substring(7).trim();
            if (!token.isEmpty() && tokenProvider.validateToken(token)) {
                String roles = tokenProvider.getRolesFromToken(token);
                if (roles != null && (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_SUPER_ADMIN") || roles.contains("ROLE_MANAGER"))) {
                    return true;
                }
            }
        }
        return false;
    }

    private String getClientIP(HttpServletRequest request) {
        // Priority 1: Cloudflare tunnel (only trust if verified via CF-Ray)
        String cfRay = request.getHeader("CF-Ray");
        if (cfRay != null && !cfRay.isBlank()) {
            String cfIp = sanitizeIpCandidate(request.getHeader("CF-Connecting-IP"));
            if (cfIp != null && !isLoopbackLiteral(cfIp)) {
                return cfIp;
            }
        }

        // Priority 2: Reverse proxy (Render / Vercel proxy)
        // Reverse proxies append client IP to the end of X-Forwarded-For. To prevent
        // an attacker from prepending fake IPs on the left, we parse from right to left.
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isEmpty()) {
            String[] parts = xfHeader.split(",");
            for (int i = parts.length - 1; i >= 0; i--) {
                String candidate = sanitizeIpCandidate(parts[i]);
                if (candidate != null && !isLoopbackLiteral(candidate) && !isInternalSubnet(candidate)) {
                    return candidate;
                }
            }
            for (int i = parts.length - 1; i >= 0; i--) {
                String candidate = sanitizeIpCandidate(parts[i]);
                if (candidate != null && !isLoopbackLiteral(candidate)) {
                    return candidate;
                }
            }
        }

        String remote = sanitizeIpCandidate(request.getRemoteAddr());
        return remote != null ? remote : "unknown";
    }

    private boolean isInternalSubnet(String ip) {
        if (ip == null) return false;
        return ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.16.")
                || ip.startsWith("172.17.") || ip.startsWith("172.18.") || ip.startsWith("172.19.")
                || ip.startsWith("172.2") || ip.startsWith("172.3") || ip.startsWith("169.254.")
                || ip.startsWith("fc00:") || ip.startsWith("fe80:");
    }

    private String sanitizeIpCandidate(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || trimmed.length() > 45) return null;
        for (int i = 0; i < trimmed.length(); i++) {
            char ch = trimmed.charAt(i);
            boolean allowed = (ch >= '0' && ch <= '9')
                    || (ch >= 'a' && ch <= 'f')
                    || (ch >= 'A' && ch <= 'F')
                    || ch == '.' || ch == ':';
            if (!allowed) return null;
        }
        return trimmed;
    }

    private boolean isLoopbackLiteral(String ip) {
        return "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip);
    }

    /**
     * Scheduled memory purge: Evicts buckets idle for more than 15 minutes and expired mutation timers
     */
    @Scheduled(fixedRate = 600000) // Every 10 minutes
    public void cleanupIdleBuckets() {
        long now = System.currentTimeMillis();
        long maxIdleMs = Duration.ofMinutes(15).toMillis();
        int initialSize = buckets.size();
        buckets.entrySet().removeIf(entry -> (now - entry.getValue().lastAccessTime) > maxIdleMs);
        lastMutationTimes.entrySet().removeIf(entry -> (now - entry.getValue()) > 60000); // 1 minute
        int purged = initialSize - buckets.size();
        if (purged > 0) {
            log.debug("[RateLimit] Cleaned up {} idle rate-limit buckets. Active: {}", purged, buckets.size());
        }
    }
}
