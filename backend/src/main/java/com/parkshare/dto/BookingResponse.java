package com.parkshare.dto;

import com.parkshare.entity.BookingStatus;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Booking response returned by the API.
 *
 * Security notes:
 * - otpCode (opening OTP) is populated ONLY in driver-facing responses when status=CONFIRMED/ACTIVE.
 * - closingOtpCode is populated ONLY in driver-facing responses when status=ACTIVE/OVERSTAY
 *   and the driver has called initiate-checkout.
 * - Both OTP values are NEVER returned in owner-facing responses.
 */
@Data
public class BookingResponse {
    private Long id;
    private Long parkingSpaceId;
    private String parkingSpaceTitle;
    private String parkingSpaceAddress;
    private Long driverId;
    private String driverName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Double totalPrice;
    private BookingStatus status;
    private LocalDateTime createdAt;

    // ── Opening OTP (PRD v1.0 Slice 2) ───────────────────────────────────────

    /**
     * 4-digit opening OTP. Populated only in driver-facing responses (status = CONFIRMED/ACTIVE).
     * Always null in owner-facing responses.
     */
    private String otpCode;

    /** How many incorrect opening OTP attempts have been made by the owner. */
    private int otpAttempts;

    // ── Closing OTP (departure confirmation) ─────────────────────────────────

    /**
     * 4-digit closing OTP. Populated only in driver-facing responses when
     * status = ACTIVE or OVERSTAY and driver has called initiate-checkout.
     * Always null in owner-facing responses.
     */
    private String closingOtpCode;

    /** How many incorrect closing OTP attempts have been made by the owner. */
    private int closingOtpAttempts;

    // ── Overstay fields ───────────────────────────────────────────────────────

    /** Timestamp when OVERSTAY began (= scheduled endTime). Set by scheduler. */
    private LocalDateTime overstayStartedAt;

    /** Timestamp of actual physical departure (closing OTP verified → COMPLETED). */
    private LocalDateTime actualClosedAt;

    /** Extra charge for overstay time (pricePerHour/60 × overstayMinutes). Null if no overstay. */
    private Double overstayExtraCharge;

    /** Status of the overstay payment: NOT_REQUIRED, PENDING, CREATED, SUCCESS, FAILED. */
    private String overstayPaymentStatus;

    // ── Actual Usage Billing (v1.3) ────────────────────────────────────────────

    /**
     * Actual charge computed at closing OTP time (real minutes used × rate/min).
     * Null until booking is COMPLETED.
     */
    private Double actualUsageCharge;

    /**
     * totalPrice - actualUsageCharge.
     * Positive → driver overpaid (refund owed to driver).
     * Zero/Negative → no refund (overstay or exact match).
     * Null until booking is COMPLETED.
     */
    private Double refundAdjustment;

    /**
     * True when the driver has called initiate-checkout (closingOtpCode is set).
     * Used by the Owner UI to decide whether to show the Closing OTP panel.
     */
    private boolean checkoutInitiated;
}
