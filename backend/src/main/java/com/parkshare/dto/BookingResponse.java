package com.parkshare.dto;

import com.parkshare.entity.BookingStatus;
import lombok.Data;

import java.time.LocalDateTime;

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
}
