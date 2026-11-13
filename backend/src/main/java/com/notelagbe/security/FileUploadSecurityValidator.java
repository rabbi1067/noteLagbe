package com.notelagbe.security;

import com.notelagbe.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

/**
 * Validates uploaded images, audio clips, and academic documents using extension allowlists,
 * content-type verification, size limits, and binary magic-byte inspection.
 */
public final class FileUploadSecurityValidator {

    public static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    public static final long MAX_AUDIO_BYTES = 15L * 1024 * 1024;
    public static final long MAX_MATERIAL_BYTES = 100L * 1024 * 1024;

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of("webm", "ogg", "oga", "mp3", "wav", "m4a", "mp4", "aac", "opus");
    private static final Set<String> MATERIAL_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "md", "zip", "jpg", "jpeg", "png", "webp"
    );
    private static final Set<String> SCRIPT_MIME_FRAGMENTS = Set.of(
            "svg", "html", "javascript", "ecmascript", "xml", "x-msdownload", "x-sh", "x-bat"
    );

    private FileUploadSecurityValidator() {}

    /**
     * Validates an image upload (PNG/JPEG/WEBP/GIF only; blocks SVG/HTML polyglots) and returns
     * the normalized dot-prefixed extension (e.g., {@code ".png"}).
     */
    public static String validateImage(MultipartFile file, long maxBytes) {
        byte[] header = precheckFile(file, maxBytes);
        String ext = extractCleanExtension(file.getOriginalFilename(), "png");
        if (!IMAGE_EXTENSIONS.contains(ext)) {
            throw new ApiException("Unsupported image format. Allowed: JPG, PNG, WEBP, GIF.", HttpStatus.BAD_REQUEST);
        }

        String contentType = safeContentType(file);
        if (contentType.isEmpty() || !contentType.startsWith("image/") || containsBlockedMime(contentType)) {
            throw new ApiException("Invalid image MIME type.", HttpStatus.BAD_REQUEST);
        }

        if (!matchesImageMagicBytes(header)) {
            throw new ApiException("Uploaded file content is not a valid binary image.", HttpStatus.BAD_REQUEST);
        }
        return "." + (ext.equals("jpeg") ? "jpg" : ext);
    }

    /**
     * Validates a community voice recording upload and returns the normalized dot-prefixed extension.
     */
    public static String validateAudio(MultipartFile file, long maxBytes) {
        byte[] header = precheckFile(file, maxBytes);
        String ext = extractCleanExtension(file.getOriginalFilename(), "webm");
        if (!AUDIO_EXTENSIONS.contains(ext)) {
            throw new ApiException("Unsupported audio format.", HttpStatus.BAD_REQUEST);
        }

        String contentType = safeContentType(file);
        boolean validMime = contentType.startsWith("audio/")
                || contentType.equals("video/webm")
                || contentType.equals("video/mp4")
                || contentType.equals("application/ogg");
        if (!validMime || containsBlockedMime(contentType)) {
            throw new ApiException("Invalid audio content type.", HttpStatus.BAD_REQUEST);
        }

        if (!matchesAudioMagicBytes(header)) {
            throw new ApiException("Uploaded file content does not match a valid audio container.", HttpStatus.BAD_REQUEST);
        }
        return "." + ext;
    }

    /**
     * Validates an academic material upload (PDF, Office, TXT/MD, ZIP, safe raster images)
     * and returns the normalized dot-prefixed extension.
     */
    public static String validateMaterial(MultipartFile file, long maxBytes) {
        byte[] header = precheckFile(file, maxBytes);
        String ext = extractCleanExtension(file.getOriginalFilename(), "");
        if (!MATERIAL_EXTENSIONS.contains(ext)) {
            throw new ApiException("Unsupported file type for academic material.", HttpStatus.BAD_REQUEST);
        }

        String contentType = safeContentType(file);
        if (!contentType.isEmpty() && containsBlockedMime(contentType)) {
            throw new ApiException("Active web or executable file types are not permitted.", HttpStatus.BAD_REQUEST);
        }

        validateMaterialSignature(ext, header);
        return "." + ext;
    }

    private static byte[] precheckFile(MultipartFile file, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Uploaded file is empty.", HttpStatus.BAD_REQUEST);
        }
        long limit = maxBytes > 0 ? maxBytes : MAX_MATERIAL_BYTES;
        if (file.getSize() > limit) {
            throw new ApiException("File exceeds maximum permitted upload size.", HttpStatus.PAYLOAD_TOO_LARGE);
        }
        return readHeader(file, 64);
    }

    private static byte[] readHeader(MultipartFile file, int len) {
        try (InputStream is = file.getInputStream()) {
            byte[] buf = new byte[len];
            int total = 0;
            while (total < len) {
                int read = is.read(buf, total, len - total);
                if (read == -1) break;
                total += read;
            }
            if (total == len) return buf;
            byte[] trimmed = new byte[total];
            System.arraycopy(buf, 0, trimmed, 0, total);
            return trimmed;
        } catch (IOException ex) {
            throw new ApiException("Unable to inspect uploaded file bytes.", HttpStatus.BAD_REQUEST);
        }
    }

    private static String extractCleanExtension(String originalFilename, String fallback) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return fallback;
        }
        String sanitized = originalFilename.replace('\\', '/');
        int slash = sanitized.lastIndexOf('/');
        if (slash >= 0) {
            sanitized = sanitized.substring(slash + 1);
        }
        int dot = sanitized.lastIndexOf('.');
        if (dot < 0 || dot == sanitized.length() - 1) {
            return fallback;
        }
        return sanitized.substring(dot + 1).toLowerCase(Locale.ROOT).trim();
    }

    private static String safeContentType(MultipartFile file) {
        String raw = file.getContentType();
        if (raw == null) return "";
        int semi = raw.indexOf(';');
        String base = semi >= 0 ? raw.substring(0, semi) : raw;
        return base.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean containsBlockedMime(String contentType) {
        for (String blocked : SCRIPT_MIME_FRAGMENTS) {
            if (contentType.contains(blocked)) {
                return true;
            }
        }
        return false;
    }

    private static void validateMaterialSignature(String ext, byte[] header) {
        if (header.length == 0) {
            throw new ApiException("Uploaded file has no readable content.", HttpStatus.BAD_REQUEST);
        }
        if ("pdf".equals(ext)) {
            String ascii = new String(header, StandardCharsets.US_ASCII);
            int pdfIdx = ascii.indexOf("%PDF-");
            if (pdfIdx < 0 || pdfIdx > 16) {
                throw new ApiException("File claims .pdf extension without a valid PDF header.", HttpStatus.BAD_REQUEST);
            }
            return;
        }
        if (IMAGE_EXTENSIONS.contains(ext)) {
            if (!matchesImageMagicBytes(header)) {
                throw new ApiException("Image material does not contain a valid raster header.", HttpStatus.BAD_REQUEST);
            }
            return;
        }
        if ("docx".equals(ext) || "pptx".equals(ext) || "xlsx".equals(ext) || "zip".equals(ext)) {
            boolean isZip = header.length >= 4 && header[0] == 'P' && header[1] == 'K'
                    && ((header[2] == 0x03 && header[3] == 0x04) || (header[2] == 0x05 && header[3] == 0x06));
            if (!isZip) {
                throw new ApiException("Archive or Office document has an invalid binary signature.", HttpStatus.BAD_REQUEST);
            }
            return;
        }
        if ("doc".equals(ext) || "ppt".equals(ext) || "xls".equals(ext)) {
            boolean isOle2 = header.length >= 8
                    && (header[0] & 0xFF) == 0xD0 && (header[1] & 0xFF) == 0xCF
                    && (header[2] & 0xFF) == 0x11 && (header[3] & 0xFF) == 0xE0;
            String ascii = new String(header, StandardCharsets.UTF_8).trim().toLowerCase(Locale.ROOT);
            boolean isRtf = ascii.startsWith("{\\rtf");
            boolean looksHtmlOrScript = ascii.startsWith("<html") || ascii.startsWith("<!doctype") || ascii.contains("<script");
            if ((!isOle2 && !isRtf) || looksHtmlOrScript) {
                throw new ApiException("Legacy Office document signature is invalid.", HttpStatus.BAD_REQUEST);
            }
            return;
        }
        // txt / md: block binary null bytes or leading HTML/script payloads
        String preview = new String(header, StandardCharsets.UTF_8).trim().toLowerCase(Locale.ROOT);
        for (byte b : header) {
            if (b == 0) {
                throw new ApiException("Text material cannot contain binary data.", HttpStatus.BAD_REQUEST);
            }
        }
        if (preview.startsWith("<script") || preview.startsWith("<!doctype html") || preview.startsWith("<html")) {
            throw new ApiException("HTML and script files are not permitted.", HttpStatus.BAD_REQUEST);
        }
    }

    private static boolean matchesImageMagicBytes(byte[] h) {
        if (h.length < 4) return false;
        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return true;
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (h.length >= 8
                && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) {
            return true;
        }
        // GIF: GIF87a / GIF89a
        if (h.length >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8'
                && (h[4] == '7' || h[4] == '9') && h[5] == 'a') {
            return true;
        }
        // WEBP: RIFF....WEBP
        return h.length >= 12
                && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
    }

    private static boolean matchesAudioMagicBytes(byte[] h) {
        if (h.length < 4) return false;
        // EBML / WebM / Matroska: 1A 45 DF A3
        if ((h[0] & 0xFF) == 0x1A && (h[1] & 0xFF) == 0x45
                && (h[2] & 0xFF) == 0xDF && (h[3] & 0xFF) == 0xA3) {
            return true;
        }
        // Ogg: OggS
        if (h[0] == 'O' && h[1] == 'g' && h[2] == 'g' && h[3] == 'S') {
            return true;
        }
        // WAV: RIFF....WAVE
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'A' && h[10] == 'V' && h[11] == 'E') {
            return true;
        }
        // MP3: ID3 tag or MPEG ADTS/frame sync
        if (h[0] == 'I' && h[1] == 'D' && h[2] == '3') {
            return true;
        }
        if ((h[0] & 0xFF) == 0xFF && ((h[1] & 0xE0) == 0xE0)) {
            return true;
        }
        // ISO Base Media (MP4 / M4A): ....ftyp
        return h.length >= 8 && h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p';
    }
}
