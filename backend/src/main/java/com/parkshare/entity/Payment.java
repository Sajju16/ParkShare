package com.parkshare.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payments")
@Getter
@Setter
public class Payment extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Column(nullable = false)
    private String razorpayOrderId;

    @Column(unique = true)
    private String razorpayPaymentId;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private Double commission;

    @Column(nullable = false)
    private Double ownerEarnings;

    @Column(nullable = false)
    private String status; // CREATED, SUCCESS, FAILED

    /**
     * Extra charge accumulated during an overstay period.
     * Calculated at closing OTP verification time and appended to the
     * existing payment record.
     */
    @Column(name = "overstay_amount", columnDefinition = "DOUBLE PRECISION DEFAULT 0.0")
    private Double overstayAmount = 0.0;

    /**
     * Overstay payment status: NOT_REQUIRED, PENDING, CREATED, SUCCESS, FAILED
     */
    @Column(name = "overstay_payment_status", columnDefinition = "VARCHAR(20) DEFAULT 'NOT_REQUIRED'")
    private String overstayPaymentStatus = "NOT_REQUIRED";

    @Column(name = "overstay_razorpay_order_id")
    private String overstayRazorpayOrderId;

    @Column(name = "overstay_razorpay_payment_id")
    private String overstayRazorpayPaymentId;
}
