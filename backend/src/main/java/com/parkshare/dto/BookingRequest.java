package com.parkshare.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * PRD v1.0: Date/time validation is enforced in BookingService, not via bean-validation
 * annotations, because the "today-or-tomorrow" window requires runtime logic.
 */
@Data
public class BookingRequest {

    @NotNull(message = "Parking space ID is required")
    private Long parkingSpaceId;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;
}
