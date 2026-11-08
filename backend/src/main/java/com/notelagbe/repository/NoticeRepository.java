package com.notelagbe.repository;

import com.notelagbe.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    @Query("SELECT n FROM Notice n WHERE n.active = true " +
           "AND (n.startsAt IS NULL OR n.startsAt <= :now) " +
           "AND (n.expiresAt IS NULL OR n.expiresAt >= :now) " +
           "ORDER BY n.priority DESC, n.createdAt DESC")
    List<Notice> findCurrentlyActiveNotices(@Param("now") LocalDateTime now);

    @Query("SELECT n FROM Notice n WHERE n.active = true AND n.expiresAt IS NOT NULL AND n.expiresAt < :now")
    List<Notice> findExpiredActiveNotices(@Param("now") LocalDateTime now);

    List<Notice> findAllByOrderByPriorityDescCreatedAtDesc();
}
