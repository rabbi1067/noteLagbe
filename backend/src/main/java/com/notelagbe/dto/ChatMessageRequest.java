package com.notelagbe.dto;

import jakarta.validation.constraints.Size;

public class ChatMessageRequest {

    @Size(max = 2000, message = "Message cannot exceed 2000 characters")
    private String text;

    private Long replyToId;
    private String replyToSender;
    private String replyToText;

    public ChatMessageRequest() {}

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Long getReplyToId() { return replyToId; }
    public void setReplyToId(Long replyToId) { this.replyToId = replyToId; }

    public String getReplyToSender() { return replyToSender; }
    public void setReplyToSender(String replyToSender) { this.replyToSender = replyToSender; }

    public String getReplyToText() { return replyToText; }
    public void setReplyToText(String replyToText) { this.replyToText = replyToText; }
}
