package com.parkshare.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
public class Booking extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_space_id", nullable = false)
    private ParkingSpace parkingSpace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Column(nullable = false)
    private Double totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    // ── PRD v1.0 — Slice 1 additions ─────────────────────────────────────────

    /**
     * Timestamp when the booking first entered PENDING status.
     * Used by the scheduler (future slice) to enforce the 5-minute
     * owner-response timeout → AUTO_REJECTED.
     */
    @Column(name = "pending_at")
    private LocalDateTime pendingAt;

    /**
     * Timestamp when the booking entered AWAITING_PAYMENT status.
     * Used by the scheduler (future slice) to enforce the 10-minute
     * payment timeout → PAYMENT_EXPIRED.
     */
    @Column(name = "awaiting_payment_at")
    private LocalDateTime awaitingPaymentAt;

    // ── PRD v1.0 — Slice 2: OTP ──────────────────────────────────────────────

    /**
     * 4-digit numeric OTP generated after successful payment.
     * The driver shows this to the owner on arrival to transition
     * the booking from CONFIRMED → ACTIVE.
     * Visible to drivers only (never returned in owner-facing responses).
     */
    @Column(name = "otp_code", length = 4)
    private String otpCode;

    /**
     * Counts how many times the owner entered an incorrect OTP.
     * When this reaches 3 the booking is locked and verification is blocked.
     */
    @Column(name = "otp_attempts", nullable = false, columnDefinition = "INT DEFAULT 0")
    private int otpAttempts = 0;
}
