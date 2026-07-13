package com.parkshare.dto;

import com.parkshare.entity.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ParkingSpaceRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotBlank(message = "Address is required")
    private String address;

    private String city;
    private String zipCode;

    @NotNull(message = "Price per hour is required")
    private Double pricePerHour;

    private Double pricePerDay;

    @NotNull(message = "Vehicle type is required")
    private VehicleType vehicleType;

    private boolean isCovered;
    private boolean hasEvCharging;

    private List<String> images;
}
