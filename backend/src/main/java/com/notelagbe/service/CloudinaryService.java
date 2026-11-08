package com.notelagbe.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    private Cloudinary cloudinary;
    private boolean configured = false;

    @PostConstruct
    public void init() {
        if (cloudName != null && !cloudName.trim().isEmpty() &&
            apiKey != null && !apiKey.trim().isEmpty() &&
            apiSecret != null && !apiSecret.trim().isEmpty()) {
            
            Map<String, String> config = new HashMap<>();
            config.put("cloud_name", cloudName.trim());
            config.put("api_key", apiKey.trim());
            config.put("api_secret", apiSecret.trim());
            config.put("secure", "true");
            
            this.cloudinary = new Cloudinary(config);
            this.configured = true;
            log.info(">>> Cloudinary successfully initialized for cloud: {}", cloudName.trim());
        } else {
            log.info(">>> Cloudinary credentials not fully supplied. Falling back to local disk storage.");
        }
    }

    public boolean isConfigured() {
        return configured;
    }

    /**
     * Uploads a file to Cloudinary.
     * @param file MultipartFile to upload
     * @param folder Folder name in Cloudinary (e.g. "notelagbe/materials", "notelagbe/avatars", "notelagbe/faculty")
     * @param isImage whether the file is guaranteed to be an image (for transformations and optimizations)
     * @return Secure HTTPS URL of the uploaded asset
     */
    public String uploadFile(MultipartFile file, String folder, boolean isImage) throws IOException {
        if (!configured || cloudinary == null) {
            throw new IllegalStateException("Cloudinary is not configured");
        }

        String resourceType = isImage ? "image" : "auto";
        Map<String, Object> params = ObjectUtils.asMap(
                "folder", folder,
                "resource_type", resourceType,
                "use_filename", true,
                "unique_filename", true,
                "overwrite", false
        );

        Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
        Object secureUrl = uploadResult.get("secure_url");
        if (secureUrl != null) {
            return secureUrl.toString();
        }
        Object url = uploadResult.get("url");
        return url != null ? url.toString() : "";
    }

    /**
     * Deletes a file from Cloudinary by extracting the public ID from URL
     */
    public void deleteFileByUrl(String url) {
        if (!configured || cloudinary == null || url == null || !url.contains("cloudinary.com")) {
            return;
        }

        try {
            // Typical format: https://res.cloudinary.com/<cloud>/image/upload/v1234567890/<folder>/<public_id>.ext
            String path = url.substring(url.indexOf("/upload/") + 8);
            if (path.startsWith("v") && path.indexOf('/') != -1) {
                path = path.substring(path.indexOf('/') + 1);
            }
            if (path.contains(".")) {
                path = path.substring(0, path.lastIndexOf('.'));
            }
            cloudinary.uploader().destroy(path, ObjectUtils.emptyMap());
            log.info("Deleted asset from Cloudinary: {}", path);
        } catch (Exception e) {
            log.warn("Could not delete file from Cloudinary: {}", e.getMessage());
        }
    }
}
