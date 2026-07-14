package com.parkshare.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentOrderResponse {
    private String razorpayOrderId;
    private Double amount;
    private String currency;
    private String keyId; // Razorpay Key ID to initialize the frontend checkout
    private Long paymentId; // Our internal payment ID
}
