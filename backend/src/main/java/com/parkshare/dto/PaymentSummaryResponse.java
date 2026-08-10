package com.parkshare.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Lightweight DTO for Payment data returned to the Owner Earnings Dashboard.
 * Avoids exposing raw JPA entities (which triggers lazy-init serialization errors)
 * and circular-reference issues with the Booking → ParkingSpace → Owner chain.
 */
@Data
@Builder
public class PaymentSummaryResponse {
    private Long id;
    private Long bookingId;
    private String parkingSpaceTitle;

    /** Razorpay payment ID (acts as transaction reference). */
    private String razorpayPaymentId;

    /** Total amount paid by driver for original booking (INR). */
    private Double amount;

    /** Platform commission (10% of amount). */
    private Double commission;

    /** Net earnings to owner after commission. */
    private Double ownerEarnings;

    /** Payment status: CREATED, SUCCESS, FAILED. */
    private String status;

    /** When the payment record was created. */
    private LocalDateTime createdAt;

    /** Overstay charge, if any (INR). */
    private Double overstayAmount;

    /** Overstay payment status: NOT_REQUIRED, PENDING, CREATED, SUCCESS, FAILED. */
    private String overstayPaymentStatus;
}
