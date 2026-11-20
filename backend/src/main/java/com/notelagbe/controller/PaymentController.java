package com.notelagbe.controller;

import com.notelagbe.dto.PaymentSubmitRequest;
import com.notelagbe.entity.PaymentRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.ActivityLogService;
import com.notelagbe.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final ActivityLogService activityLogService;

    public PaymentController(PaymentService paymentService, ActivityLogService activityLogService) {
        this.paymentService = paymentService;
        this.activityLogService = activityLogService;
    }

    @PostMapping("/submit")
    public ResponseEntity<PaymentRequest> submitPayment(
            @Valid @RequestBody PaymentSubmitRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest) {
        PaymentRequest p = paymentService.submitPayment(request, userDetails.getUser());
        try {
            String planLabel = p.getPlanType() != null ? p.getPlanType().getDisplayName() : "Subscription Plan";
            String trxLabel = p.getTransactionId() != null ? p.getTransactionId() : "N/A";
            activityLogService.logActivity(
                    "PAYMENT_SUBMIT",
                    "BILLING",
                    "Student submitted " + p.getPaymentMethod() + " payment for " + planLabel + " [৳" + Math.round(p.getAmount()) + " • TrxID: " + trxLabel + "]",
                    userDetails.getUser(),
                    httpRequest
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(p);
    }

    @GetMapping("/my")
    public ResponseEntity<List<PaymentRequest>> getMyPayments(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(paymentService.getUserPayments(userDetails.getId()));
    }
}
