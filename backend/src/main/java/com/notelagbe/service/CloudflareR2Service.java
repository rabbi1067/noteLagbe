package com.notelagbe.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

/**
 * Cloudflare R2 Object Storage Service.
 * Provides high-speed, zero-egress-fee, unlimited file size cloud storage for
 * large handwritten notes, multi-page question papers, and academic slide decks.
 */
@Service
public class CloudflareR2Service {

    private static final Logger log = LoggerFactory.getLogger(CloudflareR2Service.class);

    @Value("${r2.account-id:}")
    private String accountId;

    @Value("${r2.access-key-id:}")
    private String accessKeyId;

    @Value("${r2.secret-access-key:}")
    private String secretAccessKey;

    @Value("${r2.bucket-name:notelagbe-materials}")
    private String bucketName;

    @Value("${r2.public-url:}")
    private String publicUrl;

    private S3Client s3Client;
    private S3Presigner s3Presigner;
    private boolean configured = false;

    public CloudflareR2Service() {}

    public CloudflareR2Service(String accountId, String accessKeyId, String secretAccessKey, String bucketName, String publicUrl) {
        this.accountId = accountId;
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.bucketName = bucketName;
        this.publicUrl = publicUrl;
        init();
    }

    @PostConstruct
    public void init() {
        if (accountId != null && !accountId.trim().isEmpty() &&
            accessKeyId != null && !accessKeyId.trim().isEmpty() &&
            secretAccessKey != null && !secretAccessKey.trim().isEmpty() &&
            bucketName != null && !bucketName.trim().isEmpty()) {

            try {
                String cleanAccountId = accountId.trim();
                String endpoint = String.format("https://%s.r2.cloudflarestorage.com", cleanAccountId);

                AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId.trim(), secretAccessKey.trim());
                StaticCredentialsProvider credsProvider = StaticCredentialsProvider.create(credentials);

                this.s3Client = S3Client.builder()
                        .endpointOverride(URI.create(endpoint))
                        .credentialsProvider(credsProvider)
                        .region(Region.of("auto"))
                        .httpClient(UrlConnectionHttpClient.builder().build())
                        .serviceConfiguration(S3Configuration.builder()
                                .pathStyleAccessEnabled(true)
                                .build())
                        .build();

                this.s3Presigner = S3Presigner.builder()
                        .endpointOverride(URI.create(endpoint))
                        .credentialsProvider(credsProvider)
                        .region(Region.of("auto"))
                        .serviceConfiguration(S3Configuration.builder()
                                .pathStyleAccessEnabled(true)
                                .build())
                        .build();

                this.configured = true;
                log.info(">>> Cloudflare R2 Storage & S3Presigner successfully initialized for bucket: {}", bucketName.trim());
            } catch (Exception e) {
                log.error("Failed to initialize Cloudflare R2 S3 Client: {}", e.getMessage(), e);
                this.configured = false;
            }
        } else {
            log.info(">>> Cloudflare R2 credentials not provided. Hybrid storage using secondary providers.");
        }
    }

    @PreDestroy
    public void destroy() {
        if (s3Presigner != null) {
            try {
                s3Presigner.close();
            } catch (Exception ignored) {}
        }
        if (s3Client != null) {
            try {
                s3Client.close();
            } catch (Exception ignored) {}
        }
    }

    public boolean isConfigured() {
        return configured && s3Client != null;
    }

    /**
     * Uploads a file to Cloudflare R2.
     *
     * @param file   the multipart file to upload
     * @param folder folder/prefix inside the bucket (e.g. "notelagbe/materials")
     * @return accessible HTTPS URL of the uploaded asset (presigned or public)
     */
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudflare R2 is not configured");
        }

        String originalFilename = file.getOriginalFilename();
        String safeBaseName = "doc";
        String ext = "pdf";
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0) {
                ext = originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
                safeBaseName = originalFilename.substring(0, dot).replaceAll("[^a-zA-Z0-9.-]", "_");
            } else {
                safeBaseName = originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
            }
        }
        if (safeBaseName.length() > 35) {
            safeBaseName = safeBaseName.substring(0, 35);
        }

        String folderPrefix = (folder != null && !folder.trim().isEmpty())
                ? (folder.trim().replaceAll("^/+|/+$", "") + "/")
                : "";

        String key = folderPrefix + "r2_" + System.currentTimeMillis() + "_" +
                UUID.randomUUID().toString().substring(0, 8) + "_" + safeBaseName + "." + ext;

        String contentType = file.getContentType();
        if (contentType == null || contentType.trim().isEmpty()) {
            contentType = "application/octet-stream";
        }

        PutObjectRequest putReq = PutObjectRequest.builder()
                .bucket(bucketName.trim())
                .key(key)
                .contentType(contentType)
                .build();

        try (InputStream is = file.getInputStream()) {
            s3Client.putObject(putReq, RequestBody.fromInputStream(is, file.getSize()));
        }

        // 1. If public domain/URL is configured (e.g. https://pub-xxx.r2.dev or custom cdn domain)
        if (publicUrl != null && !publicUrl.trim().isEmpty()) {
            String base = publicUrl.trim();
            if (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            return base + "/" + key;
        }

        // 2. Generate a long-lived presigned URL so that browser can immediately view it without authorization errors
        String presigned = getPresignedDownloadUrl(key, 24 * 7); // 7 days presigned for newly uploaded assets
        if (presigned != null && !presigned.isBlank()) {
            return presigned;
        }

        // 3. Fallback to standard endpoint
        return String.format("https://%s.r2.cloudflarestorage.com/%s/%s", accountId.trim(), bucketName.trim(), key);
    }

    /**
     * Generates a secure, temporary presigned GET URL for an object stored in Cloudflare R2.
     * Allows direct, high-speed, zero-egress browser access and PDF streaming without InvalidArgumentAuthorization error.
     */
    public String getPresignedDownloadUrl(String keyOrUrl, int durationHours) {
        if (!isConfigured()) {
            return keyOrUrl;
        }

        // 1. If public domain/URL is configured (e.g. pub-xxx.r2.dev or custom cdn domain), return it directly
        if (publicUrl != null && !publicUrl.trim().isEmpty()) {
            String base = publicUrl.trim();
            if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
            String key = extractKey(keyOrUrl);
            return base + "/" + key;
        }

        if (s3Presigner == null) {
            return keyOrUrl;
        }

        try {
            String key = extractKey(keyOrUrl);
            if (key == null || key.trim().isEmpty()) {
                return keyOrUrl;
            }

            GetObjectRequest getReq = GetObjectRequest.builder()
                    .bucket(bucketName.trim())
                    .key(key)
                    .build();

            GetObjectPresignRequest presignReq = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(durationHours > 0 ? durationHours : 24))
                    .getObjectRequest(getReq)
                    .build();

            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignReq);
            String url = presigned.url().toString();
            log.info("Generated presigned Cloudflare R2 URL for key: {}", key);
            return url;
        } catch (Exception e) {
            log.warn("Failed to generate presigned R2 download URL for {}: {}", keyOrUrl, e.getMessage());
            return keyOrUrl;
        }
    }

    /**
     * Downloads raw bytes of an object directly from Cloudflare R2.
     */
    public byte[] fetchBytes(String keyOrUrl) throws IOException {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudflare R2 is not configured");
        }
        String key = extractKey(keyOrUrl);
        GetObjectRequest getReq = GetObjectRequest.builder()
                .bucket(bucketName.trim())
                .key(key)
                .build();
        return s3Client.getObject(getReq).readAllBytes();
    }

    /**
     * Streams an object directly from Cloudflare R2 without loading all bytes into server memory.
     * Ideal for 50MB+ documents and video files.
     */
    public software.amazon.awssdk.core.ResponseInputStream<software.amazon.awssdk.services.s3.model.GetObjectResponse> getObjectStream(String keyOrUrl) {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudflare R2 is not configured");
        }
        String key = extractKey(keyOrUrl);
        GetObjectRequest getReq = GetObjectRequest.builder()
                .bucket(bucketName.trim())
                .key(key)
                .build();
        return s3Client.getObject(getReq);
    }

    public boolean hasPublicCdnUrl() {
        return publicUrl != null && !publicUrl.trim().isEmpty() && !publicUrl.contains(".r2.cloudflarestorage.com");
    }

    /**
     * Deletes an object from Cloudflare R2 by key or URL.
     */
    public void deleteFileByKeyOrUrl(String fileUrlOrKey) {
        if (!isConfigured() || fileUrlOrKey == null || fileUrlOrKey.trim().isEmpty()) {
            return;
        }
        try {
            String key = extractKey(fileUrlOrKey);
            if (key != null && !key.trim().isEmpty()) {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucketName.trim())
                        .key(key)
                        .build());
                log.info("Deleted object from Cloudflare R2: {}", key);
            }
        } catch (Exception e) {
            log.warn("Failed to delete object from Cloudflare R2: {}", e.getMessage());
        }
    }

    /**
     * Extracts bucket relative key from a full Cloudflare R2 URL or key string.
     */
    public String extractKey(String urlOrKey) {
        if (urlOrKey == null) return "";
        String s = urlOrKey.trim();

        // Strip query string if present (e.g. from existing presigned URLs)
        if (s.contains("?")) {
            s = s.substring(0, s.indexOf('?'));
        }

        if (publicUrl != null && !publicUrl.trim().isEmpty()) {
            String base = publicUrl.trim();
            if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
            if (s.startsWith(base + "/")) {
                return s.substring(base.length() + 1);
            }
        }

        if (s.contains(".r2.dev/")) {
            return s.substring(s.indexOf(".r2.dev/") + 8);
        }

        if (s.contains(".r2.cloudflarestorage.com/")) {
            String afterDomain = s.substring(s.indexOf(".r2.cloudflarestorage.com/") + 26);
            int slash = afterDomain.indexOf('/');
            if (slash >= 0 && slash < afterDomain.length() - 1) {
                return afterDomain.substring(slash + 1);
            }
        }

        if (bucketName != null && !bucketName.trim().isEmpty()) {
            String bucketPattern = "/" + bucketName.trim() + "/";
            if (s.contains(bucketPattern)) {
                return s.substring(s.indexOf(bucketPattern) + bucketPattern.length());
            }
        }

        if (s.startsWith("http://") || s.startsWith("https://")) {
            int lastSlash = s.lastIndexOf('/');
            return lastSlash >= 0 ? s.substring(lastSlash + 1) : s;
        }

        return s;
    }
}
