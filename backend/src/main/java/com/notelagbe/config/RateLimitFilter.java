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

@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    // Multi-tier bucket maps with endpoint classification
    private final Map<String, BucketEntry> buckets = new ConcurrentHashMap<>();

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

        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) {
            // Strict tier: 15 attempts / min (brute force protection)
            limit = Bandwidth.builder().capacity(15).refillGreedy(15, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/chat/messages")) {
            // Chat tier: 30 messages / min (anti-spam protection)
            limit = Bandwidth.builder().capacity(30).refillGreedy(30, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/contributions") || path.startsWith("/api/waivers")) {
            // Mutation tier: 15 submissions / min
            limit = Bandwidth.builder().capacity(15).refillGreedy(15, Duration.ofMinutes(1)).build();
        } else if (path.startsWith("/api/teachers/sync-cse")) {
            // Intensive sync tier: 5 requests / min
            limit = Bandwidth.builder().capacity(5).refillGreedy(5, Duration.ofMinutes(1)).build();
        } else {
            // General high-throughput API tier: 180 requests / min
            limit = Bandwidth.builder().capacity(180).refillGreedy(180, Duration.ofMinutes(1)).build();
        }

        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String path = request.getRequestURI();

        // Whitelist static files, h2 console, uploads, SSE sync streams, and admin dashboard
        if (path.startsWith("/h2-console") ||
            path.startsWith("/static") ||
            path.startsWith("/uploads") ||
            path.startsWith("/api/sync") ||
            path.startsWith("/api/admin")) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        String clientIp = getClientIP(request);

        // Exclude internal localhost loopback from strict rate limiting during local dev
        if ("127.0.0.1".equals(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp) || "localhost".equalsIgnoreCase(clientIp)) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        // Cache key per client IP + path category
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
                    "{\"status\": 429, \"error\": \"Too Many Requests\", \"message\": \"Rate limit exceeded. Please wait %d seconds before trying again.\", \"retryAfterSeconds\": %d}",
                    waitForRefillSeconds, waitForRefillSeconds
            ));
            log.warn("[RateLimit] Throttled client: ip={}, path={}, wait={}s", clientIp, path, waitForRefillSeconds);
        }
    }

    private String getTierKey(String path) {
        if (path.startsWith("/api/auth")) return "auth";
        if (path.startsWith("/api/chat")) return "chat";
        if (path.startsWith("/api/contributions")) return "contrib";
        if (path.startsWith("/api/teachers/sync-cse")) return "sync";
        return "general";
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isEmpty()) {
            return xfHeader.split(",")[0].trim();
        }
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isEmpty()) {
            return cfIp.trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Scheduled memory purge: Evicts buckets idle for more than 15 minutes to guarantee zero memory leaks
     */
    @Scheduled(fixedRate = 600000) // Every 10 minutes
    public void cleanupIdleBuckets() {
        long now = System.currentTimeMillis();
        long maxIdleMs = Duration.ofMinutes(15).toMillis();
        int initialSize = buckets.size();
        buckets.entrySet().removeIf(entry -> (now - entry.getValue().lastAccessTime) > maxIdleMs);
        int purged = initialSize - buckets.size();
        if (purged > 0) {
            log.debug("[RateLimit] Cleaned up {} idle rate-limit buckets. Active: {}", purged, buckets.size());
        }
    }
}
