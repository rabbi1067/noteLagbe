package com.notelagbe.repository;

import com.notelagbe.entity.Subscription;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findFirstByUserIdAndActiveTrueOrderByStartDateDesc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Subscription s WHERE s.id = :id")
    Optional<Subscription> findByIdForUpdate(@Param("id") Long id);

    List<Subscription> findByUserIdOrderByStartDateDesc(Long userId);
    List<Subscription> findByActiveTrueAndEndDateBefore(LocalDateTime dateTime);
    @Query("SELECT COUNT(DISTINCT s.user.id) FROM Subscription s WHERE s.active = true AND (s.endDate IS NULL OR s.endDate >= :now)")
    long countActiveSubscribers(@Param("now") LocalDateTime now);
    void deleteByUserId(Long userId);
}
