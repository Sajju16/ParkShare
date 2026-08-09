package com.parkshare.dto;

import com.parkshare.entity.PropertyType;
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
    // FIX 4: Return coordinates so the map can render markers
    private Double latitude;
    private Double longitude;
    private Double pricePerHour;
    private Double pricePerDay;
    private VehicleType vehicleType;
    private PropertyType propertyType;
    private boolean covered;
    private boolean evCharging;
    private boolean available;
    private List<String> images;

    // ── v1.1: Live occupancy & proximity ────────────────────────────────────

    /**
     * Real-time occupancy status derived from active bookings.
     * Values: null (free), "CONFIRMED", "ACTIVE", "OVERSTAY".
     * Populated by ParkingSpaceService from BookingRepository.
     */
    private String currentOccupancyStatus;

    /**
     * Distance in kilometres from the requesting driver's location.
     * Computed server-side when lat/lng query params are provided,
     * or client-side from the Haversine formula.
     * Null when location is not available.
     */
    private Double distanceKm;
}
