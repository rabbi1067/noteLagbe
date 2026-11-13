package com.notelagbe.service;

import jakarta.annotation.PostConstruct;
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

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
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

                this.s3Client = S3Client.builder()
                        .endpointOverride(URI.create(endpoint))
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKeyId.trim(), secretAccessKey.trim())
                        ))
                        .region(Region.of("auto"))
                        .httpClient(UrlConnectionHttpClient.builder().build())
                        .serviceConfiguration(S3Configuration.builder()
                                .pathStyleAccessEnabled(true)
                                .build())
                        .build();

                this.configured = true;
                log.info(">>> Cloudflare R2 Storage successfully initialized for bucket: {}", bucketName.trim());
            } catch (Exception e) {
                log.error("Failed to initialize Cloudflare R2 S3 Client: {}", e.getMessage(), e);
                this.configured = false;
            }
        } else {
            log.info(">>> Cloudflare R2 credentials not provided. Hybrid storage using secondary providers.");
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
     * @return accessible HTTPS URL of the uploaded asset
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

        // 2. Standard R2 endpoint format
        return String.format("https://%s.r2.cloudflarestorage.com/%s/%s", accountId.trim(), bucketName.trim(), key);
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

        String bucketPattern = "/" + bucketName.trim() + "/";
        if (s.contains(bucketPattern)) {
            return s.substring(s.indexOf(bucketPattern) + bucketPattern.length());
        }

        if (s.startsWith("http://") || s.startsWith("https://")) {
            int lastSlash = s.lastIndexOf('/');
            return lastSlash >= 0 ? s.substring(lastSlash + 1) : s;
        }

        return s;
    }
}
