package com.parkshare.dto;

import com.parkshare.entity.BookingStatus;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Booking response returned by the API.
 *
 * Security note: otpCode is populated ONLY when the response is built for the
 * driver (see BookingService.mapToDriverResponse).  The owner-facing mapper
 * (mapToOwnerResponse) always leaves otpCode null so that the OTP is never
 * leaked to the owner through the API.
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

    // ── PRD v1.0 Slice 2 ────────────────────────────────────────────────────

    /**
     * 4-digit OTP.  Populated only in driver-facing responses (status = CONFIRMED).
     * Always null in owner-facing responses.
     */
    private String otpCode;

    /** How many incorrect OTP attempts have been made by the owner. */
    private int otpAttempts;
}
