package com.notelagbe.repository;

import com.notelagbe.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop150ByDeletedFalseOrderByCreatedAtAsc();

    List<ChatMessage> findByPinnedTrueAndDeletedFalseAndPinExpiresAtAfterOrderByPinnedAtDesc(LocalDateTime now);

    List<ChatMessage> findByPinnedTrueAndPinExpiresAtBefore(LocalDateTime now);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.deleted = false")
    long countActiveMessages();

    List<ChatMessage> findAllByOrderByCreatedAtDesc();
}
