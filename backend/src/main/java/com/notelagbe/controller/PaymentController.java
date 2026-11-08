package com.notelagbe.controller;

import com.notelagbe.dto.PaymentSubmitRequest;
import com.notelagbe.entity.PaymentRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/submit")
    public ResponseEntity<PaymentRequest> submitPayment(
            @Valid @RequestBody PaymentSubmitRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(paymentService.submitPayment(request, userDetails.getUser()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<PaymentRequest>> getMyPayments(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(paymentService.getUserPayments(userDetails.getId()));
    }
}
