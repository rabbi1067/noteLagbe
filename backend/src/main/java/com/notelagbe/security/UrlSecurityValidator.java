package com.notelagbe.security;

import com.notelagbe.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Shared SSRF and path-traversal guardrails for external HTTP fetches and local upload reads.
 */
public final class UrlSecurityValidator {

    private static final int CONNECT_TIMEOUT_SECONDS = 8;
    private static final int DEFAULT_MAX_REDIRECTS = 3;
    private static final Set<String> BLOCKED_HOSTNAMES = Set.of(
            "localhost",
            "localhost.localdomain",
            "ip6-localhost",
            "ip6-loopback",
            "metadata",
            "metadata.google.internal",
            "metadata.goog"
    );

    private static final HttpClient SHARED_CLIENT = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(Duration.ofSeconds(CONNECT_TIMEOUT_SECONDS))
            .build();

    private UrlSecurityValidator() {}

    /**
     * Returns the shared non-redirecting {@link HttpClient} instance.
     */
    public static HttpClient getSharedHttpClient() {
        return SHARED_CLIENT;
    }

    /**
     * Validates that a raw URL targets a public {@code http} or {@code https} endpoint
     * and does not resolve to loopback, private, link-local, CGNAT, or cloud metadata networks.
     */
    public static URI validatePublicHttpUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new ApiException("URL is required.", HttpStatus.BAD_REQUEST);
        }

        final URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException ex) {
            throw new ApiException("Malformed URL format.", HttpStatus.BAD_REQUEST);
        }

        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new ApiException("Only HTTP and HTTPS URLs are permitted.", HttpStatus.BAD_REQUEST);
        }

        if (uri.getRawUserInfo() != null) {
            throw new ApiException("Credentials inside URLs are not permitted.", HttpStatus.BAD_REQUEST);
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new ApiException("URL must specify a valid hostname.", HttpStatus.BAD_REQUEST);
        }

        String normalizedHost = unwrapIpv6Brackets(host).toLowerCase(Locale.ROOT);
        if (BLOCKED_HOSTNAMES.contains(normalizedHost)
                || normalizedHost.endsWith(".local")
                || normalizedHost.endsWith(".internal")
                || normalizedHost.endsWith(".localhost")) {
            throw new ApiException("Restricted or internal hostname is not allowed.", HttpStatus.BAD_REQUEST);
        }

        validateResolvedAddresses(normalizedHost);
        return uri;
    }

    /**
     * Validates and follows up to {@code maxRedirects} public HTTP redirects safely,
     * rejecting hops into private or restricted address space.
     */
    public static HttpResponse<InputStream> fetchValidatedStream(
            String initialUrl,
            Map<String, String> headers,
            int maxRedirects,
            Duration requestTimeout
    ) throws IOException, InterruptedException {
        int hopsLimit = maxRedirects > 0 ? maxRedirects : DEFAULT_MAX_REDIRECTS;
        String currentUrl = initialUrl;

        for (int hop = 0; hop <= hopsLimit; hop++) {
            URI currentUri = validatePublicHttpUrl(currentUrl);
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(currentUri)
                    .timeout(requestTimeout != null ? requestTimeout : Duration.ofSeconds(15))
                    .GET();
            if (headers != null) {
                headers.forEach(builder::header);
            }

            HttpResponse<InputStream> response = SHARED_CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
            int status = response.statusCode();
            if (isRedirectStatus(status)) {
                String location = response.headers().firstValue("Location").orElse(null);
                closeQuietly(response.body());
                if (location == null || location.isBlank() || hop == hopsLimit) {
                    throw new ApiException("External URL returned too many redirects.", HttpStatus.BAD_REQUEST);
                }
                currentUrl = currentUri.resolve(location.trim()).toString();
                continue;
            }
            return response;
        }
        throw new ApiException("Failed to fetch validated external URL.", HttpStatus.BAD_REQUEST);
    }

    /**
     * Performs a lightweight validated HEAD/GET reachability check (with bounded redirects)
     * without downloading arbitrary response bodies into memory.
     */
    public static int checkPublicUrlReachability(
            String initialUrl,
            String userAgent,
            Duration requestTimeout
    ) throws IOException, InterruptedException {
        String currentUrl = initialUrl;

        for (int hop = 0; hop <= DEFAULT_MAX_REDIRECTS; hop++) {
            URI currentUri = validatePublicHttpUrl(currentUrl);
            Duration effectiveTimeout = requestTimeout != null ? requestTimeout : Duration.ofSeconds(10);

            HttpRequest headRequest = HttpRequest.newBuilder()
                    .uri(currentUri)
                    .timeout(effectiveTimeout)
                    .header("User-Agent", userAgent)
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<Void> headResp = SHARED_CLIENT.send(headRequest, HttpResponse.BodyHandlers.discarding());
            int status = headResp.statusCode();

            if (status == 405 || status == 501) {
                HttpRequest getRequest = HttpRequest.newBuilder()
                        .uri(currentUri)
                        .timeout(effectiveTimeout)
                        .header("User-Agent", userAgent)
                        .header("Range", "bytes=0-1024")
                        .GET()
                        .build();
                HttpResponse<InputStream> getResp = SHARED_CLIENT.send(getRequest, HttpResponse.BodyHandlers.ofInputStream());
                status = getResp.statusCode();
                if (isRedirectStatus(status)) {
                    String location = getResp.headers().firstValue("Location").orElse(null);
                    closeQuietly(getResp.body());
                    if (location == null || location.isBlank() || hop == DEFAULT_MAX_REDIRECTS) {
                        return status;
                    }
                    currentUrl = currentUri.resolve(location.trim()).toString();
                    continue;
                }
                closeQuietly(getResp.body());
                return status;
            }

            if (isRedirectStatus(status)) {
                String location = headResp.headers().firstValue("Location").orElse(null);
                if (location == null || location.isBlank() || hop == DEFAULT_MAX_REDIRECTS) {
                    return status;
                }
                currentUrl = currentUri.resolve(location.trim()).toString();
                continue;
            }
            return status;
        }
        return 400;
    }

    /**
     * Reads up to {@code maxBytes} from {@code inputStream}, failing fast with HTTP 413 if exceeded.
     */
    public static byte[] readBoundedBytes(InputStream inputStream, int maxBytes) throws IOException {
        if (inputStream == null) {
            return new byte[0];
        }
        try (InputStream in = inputStream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16384];
            long total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) {
                    throw new ApiException("Remote resource exceeds the maximum allowed size.", HttpStatus.PAYLOAD_TOO_LARGE);
                }
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        }
    }

    /**
     * Resolves a user/DB-supplied path relative to {@code baseDir}, blocking {@code ..} traversal
     * or escaping outside {@code baseDir}.
     */
    public static Path resolveSafeLocalPath(Path baseDir, String rawPath, String... allowedPrefixes) {
        if (baseDir == null || rawPath == null || rawPath.isBlank()) {
            throw new ApiException("Invalid local resource path.", HttpStatus.BAD_REQUEST);
        }

        String candidate = rawPath.trim().replace('\\', '/');
        int queryIdx = candidate.indexOf('?');
        if (queryIdx >= 0) {
            candidate = candidate.substring(0, queryIdx);
        }
        if (allowedPrefixes != null) {
            for (String prefix : allowedPrefixes) {
                if (prefix != null && !prefix.isEmpty() && candidate.startsWith(prefix)) {
                    candidate = candidate.substring(prefix.length());
                    break;
                }
            }
        }
        while (candidate.startsWith("/")) {
            candidate = candidate.substring(1);
        }
        if (candidate.isBlank() || candidate.contains("..")) {
            throw new ApiException("Restricted file path traversal is not permitted.", HttpStatus.FORBIDDEN);
        }

        Path normalizedBase = baseDir.toAbsolutePath().normalize();
        Path resolved = normalizedBase.resolve(candidate).normalize();
        if (!resolved.startsWith(normalizedBase)) {
            throw new ApiException("Access outside upload root is not permitted.", HttpStatus.FORBIDDEN);
        }
        return resolved;
    }

    private static void validateResolvedAddresses(String host) {
        final InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException ex) {
            throw new ApiException("Unable to resolve external hostname.", HttpStatus.BAD_REQUEST);
        }

        if (addresses == null || addresses.length == 0) {
            throw new ApiException("No network address resolved for URL host.", HttpStatus.BAD_REQUEST);
        }

        for (InetAddress address : addresses) {
            if (isRestrictedAddress(address)) {
                throw new ApiException("Access to private, loopback, or metadata network addresses is denied.", HttpStatus.BAD_REQUEST);
            }
        }
    }

    /**
     * Returns {@code true} if {@code address} falls inside loopback, RFC1918 private,
     * link-local, multicast, CGNAT, cloud metadata, or ULA ranges.
     */
    public static boolean isRestrictedAddress(InetAddress address) {
        if (address == null) {
            return true;
        }
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }

        byte[] raw = address.getAddress();
        if (raw.length == 4) {
            return isRestrictedIpv4(raw);
        }
        if (raw.length == 16) {
            // Handle IPv4-mapped IPv6 addresses (::ffff:a.b.c.d)
            if (isIpv4MappedIpv6(raw)) {
                byte[] v4 = new byte[]{raw[12], raw[13], raw[14], raw[15]};
                return isRestrictedIpv4(v4);
            }
            int first = raw[0] & 0xFF;
            // Unique Local Address fc00::/7
            if ((first & 0xFE) == 0xFC) {
                return true;
            }
            // Link-local fe80::/10
            int second = raw[1] & 0xFF;
            return first == 0xFE && (second & 0xC0) == 0x80;
        }
        return true;
    }

    private static boolean isRestrictedIpv4(byte[] ip) {
        int b0 = ip[0] & 0xFF;
        int b1 = ip[1] & 0xFF;
        int b2 = ip[2] & 0xFF;

        if (b0 == 0) return true; // 0.0.0.0/8 "This host on this network"
        if (b0 == 10) return true; // 10.0.0.0/8 private
        if (b0 == 127) return true; // 127.0.0.0/8 loopback
        if (b0 == 169 && b1 == 254) return true; // 169.254.0.0/16 link-local & cloud metadata
        if (b0 == 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 private
        if (b0 == 192 && b1 == 168) return true; // 192.168.0.0/16 private
        if (b0 == 100 && (b1 & 0xC0) == 64) return true; // 100.64.0.0/10 CGNAT
        if (b0 == 192 && b1 == 0 && b2 == 0) return true; // 192.0.0.0/24 IETF protocol assignments
        if (b0 == 192 && b1 == 0 && b2 == 2) return true; // 192.0.2.0/24 TEST-NET-1
        if (b0 == 198 && (b1 == 18 || b1 == 19)) return true; // 198.18.0.0/15 benchmarking
        if (b0 == 198 && b1 == 51 && b2 == 100) return true; // 198.51.100.0/24 TEST-NET-2
        if (b0 == 203 && b1 == 0 && b2 == 113) return true; // 203.0.113.0/24 TEST-NET-3
        return b0 >= 224; // multicast & reserved 240.0.0.0/4
    }

    private static boolean isIpv4MappedIpv6(byte[] raw) {
        for (int i = 0; i < 10; i++) {
            if (raw[i] != 0) return false;
        }
        return (raw[10] & 0xFF) == 0xFF && (raw[11] & 0xFF) == 0xFF;
    }

    private static String unwrapIpv6Brackets(String host) {
        if (host.startsWith("[") && host.endsWith("]") && host.length() > 2) {
            return host.substring(1, host.length() - 1);
        }
        return host;
    }

    private static boolean isRedirectStatus(int status) {
        return status == 301 || status == 302 || status == 303 || status == 307 || status == 308;
    }

    private static void closeQuietly(InputStream stream) {
        if (stream != null) {
            try {
                stream.close();
            } catch (IOException ignored) {
                // Ignore stream close errors during redirect cleanup
            }
        }
    }
}
