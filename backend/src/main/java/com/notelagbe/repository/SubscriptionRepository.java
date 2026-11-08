package com.notelagbe.repository;

import com.notelagbe.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findFirstByUserIdAndActiveTrueOrderByStartDateDesc(Long userId);
    List<Subscription> findByUserIdOrderByStartDateDesc(Long userId);
    List<Subscription> findByActiveTrueAndEndDateBefore(LocalDateTime dateTime);
    void deleteByUserId(Long userId);
}
