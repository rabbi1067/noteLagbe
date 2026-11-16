package com.notelagbe.repository;

import com.notelagbe.entity.PaymentRequest;
import com.notelagbe.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {
    long countByStatus(PaymentStatus status);
    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM PaymentRequest p WHERE p.status = :status")
    Double sumAmountByStatus(@Param("status") PaymentStatus status);
    List<PaymentRequest> findAllByOrderByCreatedAtDesc();
    List<PaymentRequest> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<PaymentRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<PaymentRequest> findByTransactionIdOrderByCreatedAtDesc(String transactionId);
    boolean existsByTransactionId(String transactionId);
    boolean existsByTransactionIdAndStatusNot(String transactionId, PaymentStatus status);
    void deleteByUserId(Long userId);
}
