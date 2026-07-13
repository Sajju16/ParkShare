package com.parkshare.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OwnerStatsResponse {
    private Double todayRevenueEstimate;
    private Integer activeOccupancy;
    private Integer pendingRequests;
}
