package com.notelagbe.repository;

import com.notelagbe.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop150ByDeletedFalseOrderByCreatedAtDesc();

    List<ChatMessage> findByPinnedTrueAndDeletedFalseAndPinExpiresAtAfterOrderByPinnedAtDesc(LocalDateTime now);

    List<ChatMessage> findByPinnedTrueAndPinExpiresAtBefore(LocalDateTime now);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.deleted = false")
    long countActiveMessages();

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.deleted = true")
    long countSoftDeletedMessages();

    @Query("SELECT m FROM ChatMessage m WHERE m.createdAt < :cutoff AND (m.pinned = false OR m.deleted = true)")
    List<ChatMessage> findPurgeableMessages(@Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.createdAt < :cutoff AND (m.pinned = false OR m.deleted = true)")
    long countPurgeableMessages(@Param("cutoff") LocalDateTime cutoff);

    Optional<ChatMessage> findTop1ByDeletedFalseOrderByCreatedAtAsc();

    List<ChatMessage> findAllByOrderByCreatedAtDesc();
}
