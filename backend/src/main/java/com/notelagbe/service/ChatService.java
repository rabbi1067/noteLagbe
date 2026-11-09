package com.notelagbe.service;

import com.notelagbe.dto.ChatMessageDto;
import com.notelagbe.dto.ChatMessageRequest;
import com.notelagbe.entity.ChatMessage;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.ChatMessageRepository;
import com.notelagbe.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ProfanityFilterService profanityFilterService;
    private final LiveSyncService liveSyncService;
    private final InputSanitizationService inputSanitizationService;

    public ChatService(ChatMessageRepository chatMessageRepository,
                       UserRepository userRepository,
                       ProfanityFilterService profanityFilterService,
                       LiveSyncService liveSyncService,
                       InputSanitizationService inputSanitizationService) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.profanityFilterService = profanityFilterService;
        this.liveSyncService = liveSyncService;
        this.inputSanitizationService = inputSanitizationService;
    }

    // High-performance thread-safe memory cache to eliminate database load on repeated polls
    private final Object cacheLock = new Object();
    private volatile List<ChatMessage> cachedMessages = null;
    private volatile long cachedMessagesTimestamp = 0L;
    private volatile ChatMessage cachedPinned = null;
    private volatile long cachedPinnedTimestamp = 0L;
    private static final long CACHE_TTL_MS = 20000L; // 20 seconds TTL

    private void invalidateCache() {
        synchronized (cacheLock) {
            cachedMessages = null;
            cachedPinned = null;
            cachedMessagesTimestamp = 0L;
            cachedPinnedTimestamp = 0L;
        }
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getRecentMessages(Long currentUserId) {
        long now = System.currentTimeMillis();
        List<ChatMessage> list = cachedMessages;
        if (list == null || (now - cachedMessagesTimestamp) > CACHE_TTL_MS) {
            synchronized (cacheLock) {
                if (cachedMessages == null || (now - cachedMessagesTimestamp) > CACHE_TTL_MS) {
                    cachedMessages = chatMessageRepository.findTop150ByDeletedFalseOrderByCreatedAtAsc();
                    cachedMessagesTimestamp = System.currentTimeMillis();
                }
                list = cachedMessages;
            }
        }
        return list.stream()
                .map(m -> ChatMessageDto.fromEntity(m, currentUserId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChatMessageDto getActivePinnedMessage(Long currentUserId) {
        long now = System.currentTimeMillis();
        ChatMessage pin = cachedPinned;
        if (cachedPinnedTimestamp == 0L || (now - cachedPinnedTimestamp) > CACHE_TTL_MS) {
            synchronized (cacheLock) {
                if (cachedPinnedTimestamp == 0L || (now - cachedPinnedTimestamp) > CACHE_TTL_MS) {
                    List<ChatMessage> pinned = chatMessageRepository
                            .findByPinnedTrueAndDeletedFalseAndPinExpiresAtAfterOrderByPinnedAtDesc(LocalDateTime.now());
                    cachedPinned = pinned.isEmpty() ? null : pinned.get(0);
                    cachedPinnedTimestamp = System.currentTimeMillis();
                }
                pin = cachedPinned;
            }
        }
        if (pin == null) {
            return null;
        }
        return ChatMessageDto.fromEntity(pin, currentUserId);
    }

    @Transactional
    public ChatMessageDto sendTextMessage(User sender, ChatMessageRequest req) {
        if (sender.isChatBlocked()) {
            throw new ApiException("Your chat privileges have been suspended by an administrator due to policy violations.");
        }

        if (req.getText() == null || req.getText().trim().isEmpty()) {
            throw new ApiException("Message text cannot be empty.");
        }

        // Apply enterprise input threat shield & automated profanity filter
        String cleanText = inputSanitizationService.sanitizeAndValidateChatMessage(req.getText().trim());

        ChatMessage msg = new ChatMessage();
        msg.setSender(sender);
        msg.setSenderName(sender.getName());
        msg.setSenderEmail(sender.getEmail());
        msg.setSenderAvatarUrl(sender.getAvatarUrl());
        msg.setSenderRole(sender.getRole() != null ? sender.getRole() : Role.ROLE_STUDENT);
        msg.setMessageType("TEXT");
        msg.setText(cleanText);
        msg.setCreatedAt(LocalDateTime.now());

        if (req.getReplyToId() != null) {
            msg.setReplyToId(req.getReplyToId());
            msg.setReplyToSender(req.getReplyToSender());
            msg.setReplyToText(req.getReplyToText());
        }

        ChatMessage saved = chatMessageRepository.save(msg);
        invalidateCache();
        liveSyncService.broadcast("chat", "message_created", saved.getId());
        return ChatMessageDto.fromEntity(saved, sender.getId());
    }

    @Transactional
    public ChatMessageDto sendVoiceMessage(User sender,
                                          MultipartFile audioFile,
                                          Integer duration,
                                          Long replyToId,
                                          String replyToSender,
                                          String replyToText) throws IOException {
        if (sender.isChatBlocked()) {
            throw new ApiException("Your chat privileges have been suspended by an administrator.");
        }

        if (audioFile == null || audioFile.isEmpty()) {
            throw new ApiException("No audio file provided.");
        }

        if (audioFile.getSize() > 15 * 1024 * 1024) {
            throw new ApiException("Audio recording exceeds 15 MB limit.");
        }

        Path uploadDir = Paths.get("uploads", "voice").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String orig = audioFile.getOriginalFilename();
        String ext = "webm";
        if (orig != null && orig.contains(".")) {
            ext = orig.substring(orig.lastIndexOf('.') + 1).toLowerCase();
        }

        String fileName = "voice_" + sender.getId() + "_" + System.currentTimeMillis() + "." + ext;
        Path targetPath = uploadDir.resolve(fileName);
        Files.copy(audioFile.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String voiceUrl = "/uploads/voice/" + fileName;

        ChatMessage msg = new ChatMessage();
        msg.setSender(sender);
        msg.setSenderName(sender.getName());
        msg.setSenderEmail(sender.getEmail());
        msg.setSenderAvatarUrl(sender.getAvatarUrl());
        msg.setSenderRole(sender.getRole() != null ? sender.getRole() : Role.ROLE_STUDENT);
        msg.setMessageType("VOICE");
        msg.setVoiceUrl(voiceUrl);
        msg.setVoiceDuration(duration != null ? duration : 0);
        msg.setCreatedAt(LocalDateTime.now());

        if (replyToId != null) {
            msg.setReplyToId(replyToId);
            msg.setReplyToSender(replyToSender);
            msg.setReplyToText(replyToText);
        }

        ChatMessage saved = chatMessageRepository.save(msg);
        invalidateCache();
        liveSyncService.broadcast("chat", "message_created", saved.getId());
        return ChatMessageDto.fromEntity(saved, sender.getId());
    }

    @Transactional
    public ChatMessageDto sendImageMessage(User sender,
                                          MultipartFile imageFile,
                                          String caption,
                                          Long replyToId,
                                          String replyToSender,
                                          String replyToText) throws IOException {
        if (sender.isChatBlocked()) {
            throw new ApiException("Your chat privileges have been suspended by an administrator.");
        }

        if (imageFile == null || imageFile.isEmpty()) {
            throw new ApiException("No image file provided.");
        }

        if (imageFile.getSize() > 15 * 1024 * 1024) {
            throw new ApiException("Image exceeds 15 MB limit.");
        }

        Path uploadDir = Paths.get("uploads", "chat_images").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String orig = imageFile.getOriginalFilename();
        String ext = "jpg";
        if (orig != null && orig.contains(".")) {
            ext = orig.substring(orig.lastIndexOf('.') + 1).toLowerCase();
        }

        String fileName = "chat_img_" + sender.getId() + "_" + System.currentTimeMillis() + "." + ext;
        Path targetPath = uploadDir.resolve(fileName);
        Files.copy(imageFile.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String imageUrl = "/uploads/chat_images/" + fileName;

        ChatMessage msg = new ChatMessage();
        msg.setSender(sender);
        msg.setSenderName(sender.getName());
        msg.setSenderEmail(sender.getEmail());
        msg.setSenderAvatarUrl(sender.getAvatarUrl());
        msg.setSenderRole(sender.getRole() != null ? sender.getRole() : Role.ROLE_STUDENT);
        msg.setMessageType("IMAGE");
        msg.setImageUrl(imageUrl);
        msg.setText(caption != null && !caption.trim().isEmpty() ? profanityFilterService.filterProfanity(caption.trim()) : null);
        msg.setCreatedAt(LocalDateTime.now());

        if (replyToId != null) {
            msg.setReplyToId(replyToId);
            msg.setReplyToSender(replyToSender);
            msg.setReplyToText(replyToText);
        }

        ChatMessage saved = chatMessageRepository.save(msg);
        invalidateCache();
        liveSyncService.broadcast("chat", "message_created", saved.getId());
        return ChatMessageDto.fromEntity(saved, sender.getId());
    }

    @Transactional
    public ChatMessageDto toggleLike(Long messageId, User user) {
        ChatMessage msg = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with ID: " + messageId));

        if (msg.isDeleted()) {
            throw new ApiException("Cannot like a deleted message.");
        }

        Set<Long> liked = msg.getLikedUserIds();
        if (liked.contains(user.getId())) {
            liked.remove(user.getId());
        } else {
            liked.add(user.getId());
        }
        msg.setLikesCount(liked.size());
        ChatMessage saved = chatMessageRepository.save(msg);

        invalidateCache();
        liveSyncService.broadcast("chat", "message_liked", messageId);
        return ChatMessageDto.fromEntity(saved, user.getId());
    }

    @Transactional
    public ChatMessageDto pinMessage(Long messageId, User admin) {
        // Unpin any previous pinned messages
        List<ChatMessage> existing = chatMessageRepository
                .findByPinnedTrueAndDeletedFalseAndPinExpiresAtAfterOrderByPinnedAtDesc(LocalDateTime.now());
        for (ChatMessage prev : existing) {
            prev.setPinned(false);
            chatMessageRepository.save(prev);
        }

        ChatMessage msg = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with ID: " + messageId));

        msg.setPinned(true);
        msg.setPinnedAt(LocalDateTime.now());
        // Stays pinned for exactly 24 hours, then automatically unpins
        msg.setPinExpiresAt(LocalDateTime.now().plusHours(24));

        ChatMessage saved = chatMessageRepository.save(msg);
        invalidateCache();
        liveSyncService.broadcast("chat", "message_pinned", messageId);
        return ChatMessageDto.fromEntity(saved, admin.getId());
    }

    @Transactional
    public void unpinMessage(Long messageId) {
        ChatMessage msg = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with ID: " + messageId));
        msg.setPinned(false);
        chatMessageRepository.save(msg);
        invalidateCache();
        liveSyncService.broadcast("chat", "message_unpinned", messageId);
    }

    @Transactional
    public void deleteMessage(Long messageId) {
        ChatMessage msg = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with ID: " + messageId));
        msg.setDeleted(true);
        msg.setPinned(false);
        chatMessageRepository.save(msg);
        invalidateCache();
        liveSyncService.broadcast("chat", "message_deleted", messageId);
    }

    @Transactional
    public Map<String, Object> setUserChatBlocked(Long userId, boolean blocked) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        u.setChatBlocked(blocked);
        userRepository.save(u);

        liveSyncService.broadcast("user", blocked ? "chat_blocked" : "chat_unblocked", userId);
        return Map.of(
                "success", true,
                "userId", userId,
                "name", u.getName(),
                "email", u.getEmail(),
                "chatBlocked", blocked,
                "message", blocked
                        ? "User has been blocked from sending messages in community chat."
                        : "User chat privileges have been restored."
        );
    }

    /**
     * Auto-unpin scheduler: Runs every 60 seconds.
     * Checks if pinned message has exceeded its 24-hour expiration window.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void autoUnpinExpiredMessages() {
        List<ChatMessage> expired = chatMessageRepository.findByPinnedTrueAndPinExpiresAtBefore(LocalDateTime.now());
        if (!expired.isEmpty()) {
            for (ChatMessage msg : expired) {
                msg.setPinned(false);
                chatMessageRepository.save(msg);
                log.info("[Chat Auto-Unpin] Message ID {} unpinned after 24 hours.", msg.getId());
            }
            invalidateCache();
            liveSyncService.broadcast("chat", "auto_unpinned", null);
        }
    }

    public int getActiveUsersCount() {
        return liveSyncService.getActiveClientsCount();
    }
}
