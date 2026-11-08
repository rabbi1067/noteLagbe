package com.notelagbe.repository;

import com.notelagbe.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query("SELECT a FROM ActivityLog a WHERE a.createdAt >= :cutoff AND " +
           "(:actionType IS NULL OR a.actionType = :actionType) AND (" +
           "LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.details) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(a.userEmail, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(a.userName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(a.ipAddress, '')) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ") ORDER BY a.createdAt DESC")
    Page<ActivityLog> searchLogs(
            @Param("cutoff") LocalDateTime cutoff,
            @Param("actionType") String actionType,
            @Param("search") String search,
            Pageable pageable
    );

    long countByCreatedAtAfter(LocalDateTime cutoff);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT a.ipAddress) FROM ActivityLog a WHERE a.createdAt >= :cutoff")
    long countDistinctIpAddressesAfter(@Param("cutoff") LocalDateTime cutoff);

    @Transactional
    @Modifying
    @Query("DELETE FROM ActivityLog a WHERE a.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
