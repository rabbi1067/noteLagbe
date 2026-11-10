package com.notelagbe.repository;

import com.notelagbe.entity.PaymentRequest;
import com.notelagbe.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {
    List<PaymentRequest> findAllByOrderByCreatedAtDesc();
    List<PaymentRequest> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<PaymentRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByTransactionId(String transactionId);
    void deleteByUserId(Long userId);
}
