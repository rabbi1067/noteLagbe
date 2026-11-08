package com.notelagbe.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LinkVerificationResponse {
    private boolean valid;
    
    @JsonProperty("isPublic")
    private boolean isPublic;
    
    @JsonProperty("isGoogleDrive")
    private boolean isGoogleDrive;
    
    private String fileId;
    private String status; // "PUBLIC", "RESTRICTED", "INVALID_URL", "UNREACHABLE", "ERROR"
    private String message;
    private String previewUrl;

    public LinkVerificationResponse() {}

    public LinkVerificationResponse(boolean valid, boolean isPublic, boolean isGoogleDrive, String fileId, String status, String message, String previewUrl) {
        this.valid = valid;
        this.isPublic = isPublic;
        this.isGoogleDrive = isGoogleDrive;
        this.fileId = fileId;
        this.status = status;
        this.message = message;
        this.previewUrl = previewUrl;
    }

    public static LinkVerificationResponse publicLink(boolean isGoogleDrive, String fileId, String message, String previewUrl) {
        return new LinkVerificationResponse(true, true, isGoogleDrive, fileId, "PUBLIC", message, previewUrl);
    }

    public static LinkVerificationResponse restrictedGoogleDrive(String fileId, String message) {
        return new LinkVerificationResponse(true, false, true, fileId, "RESTRICTED", message, null);
    }

    public static LinkVerificationResponse invalidUrl(String message) {
        return new LinkVerificationResponse(false, false, false, null, "INVALID_URL", message, null);
    }

    public static LinkVerificationResponse unreachable(String message) {
        return new LinkVerificationResponse(true, false, false, null, "UNREACHABLE", message, null);
    }

    // Getters and Setters
    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    @JsonProperty("isPublic")
    public boolean isPublic() {
        return isPublic;
    }

    public void setPublic(boolean aPublic) {
        isPublic = aPublic;
    }

    @JsonProperty("isGoogleDrive")
    public boolean isGoogleDrive() {
        return isGoogleDrive;
    }

    public void setGoogleDrive(boolean googleDrive) {
        isGoogleDrive = googleDrive;
    }

    public String getFileId() {
        return fileId;
    }

    public void setFileId(String fileId) {
        this.fileId = fileId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getPreviewUrl() {
        return previewUrl;
    }

    public void setPreviewUrl(String previewUrl) {
        this.previewUrl = previewUrl;
    }
}

