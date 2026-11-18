package com.notelagbe.dto;

import com.notelagbe.entity.ChatMessage;
import java.time.LocalDateTime;

public class ChatMessageDto {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderEmail;
    private String senderAvatarUrl;
    private String senderRole;
    private String messageType;
    private String text;
    private String imageUrl;
    private String voiceUrl;
    private Integer voiceDuration;
    private Long replyToId;
    private String replyToSender;
    private String replyToText;
    private int likesCount;
    private boolean likedByMe;
    private int dislikesCount;
    private boolean dislikedByMe;
    private boolean pinned;
    private LocalDateTime pinnedAt;
    private LocalDateTime pinExpiresAt;
    private LocalDateTime createdAt;

    public ChatMessageDto() {}

    public static ChatMessageDto fromEntity(ChatMessage msg, Long currentUserId) {
        ChatMessageDto dto = new ChatMessageDto();
        dto.setId(msg.getId());
        dto.setSenderId(msg.getSender() != null ? msg.getSender().getId() : null);
        dto.setSenderName(msg.getSenderName());
        dto.setSenderEmail(msg.getSenderEmail());
        dto.setSenderAvatarUrl(msg.getSenderAvatarUrl());
        dto.setSenderRole(msg.getSenderRole() != null ? msg.getSenderRole().name() : "ROLE_STUDENT");
        dto.setMessageType(msg.getMessageType());
        dto.setText(msg.getText());
        dto.setImageUrl(msg.getImageUrl());
        dto.setVoiceUrl(msg.getVoiceUrl());
        dto.setVoiceDuration(msg.getVoiceDuration() != null ? msg.getVoiceDuration() : 0);
        dto.setReplyToId(msg.getReplyToId());
        dto.setReplyToSender(msg.getReplyToSender());
        dto.setReplyToText(msg.getReplyToText());
        int realLikes = msg.getLikedUserIds() != null ? msg.getLikedUserIds().size() : 0;
        int realDislikes = msg.getDislikedUserIds() != null ? msg.getDislikedUserIds().size() : 0;
        dto.setLikesCount(realLikes);
        dto.setLikedByMe(currentUserId != null && msg.getLikedUserIds() != null && msg.getLikedUserIds().contains(currentUserId));
        dto.setDislikesCount(realDislikes);
        dto.setDislikedByMe(currentUserId != null && msg.getDislikedUserIds() != null && msg.getDislikedUserIds().contains(currentUserId));
        dto.setPinned(msg.isPinned());
        dto.setPinnedAt(msg.getPinnedAt());
        dto.setPinExpiresAt(msg.getPinExpiresAt());
        dto.setCreatedAt(msg.getCreatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getSenderAvatarUrl() { return senderAvatarUrl; }
    public void setSenderAvatarUrl(String senderAvatarUrl) { this.senderAvatarUrl = senderAvatarUrl; }

    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getVoiceUrl() { return voiceUrl; }
    public void setVoiceUrl(String voiceUrl) { this.voiceUrl = voiceUrl; }

    public Integer getVoiceDuration() { return voiceDuration; }
    public void setVoiceDuration(Integer voiceDuration) { this.voiceDuration = voiceDuration; }

    public Long getReplyToId() { return replyToId; }
    public void setReplyToId(Long replyToId) { this.replyToId = replyToId; }

    public String getReplyToSender() { return replyToSender; }
    public void setReplyToSender(String replyToSender) { this.replyToSender = replyToSender; }

    public String getReplyToText() { return replyToText; }
    public void setReplyToText(String replyToText) { this.replyToText = replyToText; }

    public int getLikesCount() { return likesCount; }
    public void setLikesCount(int likesCount) { this.likesCount = likesCount; }

    public boolean isLikedByMe() { return likedByMe; }
    public void setLikedByMe(boolean likedByMe) { this.likedByMe = likedByMe; }

    public int getDislikesCount() { return dislikesCount; }
    public void setDislikesCount(int dislikesCount) { this.dislikesCount = dislikesCount; }

    public boolean isDislikedByMe() { return dislikedByMe; }
    public void setDislikedByMe(boolean dislikedByMe) { this.dislikedByMe = dislikedByMe; }

    public boolean isPinned() { return pinned; }
    public void setPinned(boolean pinned) { this.pinned = pinned; }

    public LocalDateTime getPinnedAt() { return pinnedAt; }
    public void setPinnedAt(LocalDateTime pinnedAt) { this.pinnedAt = pinnedAt; }

    public LocalDateTime getPinExpiresAt() { return pinExpiresAt; }
    public void setPinExpiresAt(LocalDateTime pinExpiresAt) { this.pinExpiresAt = pinExpiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
