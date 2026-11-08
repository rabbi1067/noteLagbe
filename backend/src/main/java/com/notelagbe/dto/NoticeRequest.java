package com.notelagbe.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class NoticeRequest {

    @NotBlank(message = "Notice text cannot be empty")
    @Size(max = 300, message = "Notice text cannot exceed 300 characters")
    private String text;

    private String type = "INFO";

    @Size(max = 500, message = "Link cannot exceed 500 characters")
    private String link;

    private boolean active = true;

    private int priority = 0;

    private LocalDateTime startsAt;

    private LocalDateTime expiresAt;

    public NoticeRequest() {}

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}
