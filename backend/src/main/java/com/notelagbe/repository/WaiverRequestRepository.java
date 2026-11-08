package com.notelagbe.repository;

import com.notelagbe.entity.PaymentStatus;
import com.notelagbe.entity.WaiverRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WaiverRequestRepository extends JpaRepository<WaiverRequest, Long> {
    List<WaiverRequest> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<WaiverRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    void deleteByUserId(Long userId);
}
