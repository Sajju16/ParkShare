package com.parkshare.dto;

import com.parkshare.entity.VehicleType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ParkingSpaceResponse {
    private Long id;
    private Long ownerId;
    private String ownerName;
    private String title;
    private String description;
    private String address;
    private String city;
    private String zipCode;
    private Double pricePerHour;
    private Double pricePerDay;
    private VehicleType vehicleType;
    private boolean isCovered;
    private boolean hasEvCharging;
    private boolean isAvailable;
    private List<String> images;
}
