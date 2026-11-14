package com.notelagbe.repository;

import com.notelagbe.entity.AiExamChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AiExamChatMessageRepository extends JpaRepository<AiExamChatMessage, Long> {

    List<AiExamChatMessage> findByUserIdAndCourseCodeIgnoreCaseAndCreatedAtAfterOrderByCreatedAtAsc(
            Long userId, String courseCode, LocalDateTime cutoff);

    @Modifying
    @Transactional
    @Query("DELETE FROM AiExamChatMessage m WHERE m.createdAt < :cutoff")
    int deleteByCreatedAtBefore(@Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Transactional
    void deleteByUserIdAndCourseCodeIgnoreCase(Long userId, String courseCode);

    long countByUserIdAndCourseCodeIgnoreCaseAndCreatedAtAfter(
            Long userId, String courseCode, LocalDateTime cutoff);
}
