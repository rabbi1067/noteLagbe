package com.notelagbe.dto;

import com.notelagbe.entity.PaymentMethod;
import com.notelagbe.entity.PlanType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class PaymentSubmitRequest {
    @NotNull(message = "Plan type is required")
    private PlanType planType;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @NotBlank(message = "Sender phone number is required")
    @Pattern(regexp = "^(\\+?8801|01)[3-9]\\d{8}$", message = "Please provide a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX)")
    private String senderPhone;

    @NotBlank(message = "Transaction ID is required")
    @Size(min = 6, max = 25, message = "Transaction ID must be between 6 and 25 characters")
    private String transactionId;

    @Size(max = 500, message = "Slip URL cannot exceed 500 characters")
    private String slipUrl;

    private String selectedCoursesJson;

    public PaymentSubmitRequest() {}

    public PlanType getPlanType() { return planType; }
    public void setPlanType(PlanType planType) { this.planType = planType; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getSenderPhone() { return senderPhone; }
    public void setSenderPhone(String senderPhone) { this.senderPhone = senderPhone; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getSlipUrl() { return slipUrl; }
    public void setSlipUrl(String slipUrl) { this.slipUrl = slipUrl; }

    public String getSelectedCoursesJson() { return selectedCoursesJson; }
    public void setSelectedCoursesJson(String selectedCoursesJson) { this.selectedCoursesJson = selectedCoursesJson; }
}
