package com.parkshare.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "parking_spaces")
@Getter
@Setter
public class ParkingSpace extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String address;

    private String city;
    private String zipCode;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private Double pricePerHour;

    private Double pricePerDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    private boolean isCovered;
    private boolean hasEvCharging;

    @Column(nullable = false)
    private boolean isAvailable = true;

    @ElementCollection
    @CollectionTable(name = "parking_space_images", joinColumns = @JoinColumn(name = "parking_space_id"))
    @Column(name = "image_url")
    private List<String> images;
}
