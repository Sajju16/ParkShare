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
     * existing payment record.  Does not trigger a new Razorpay order in v1.0.
     */
    @Column(name = "overstay_amount", columnDefinition = "DOUBLE DEFAULT 0.0")
    private Double overstayAmount = 0.0;
}
