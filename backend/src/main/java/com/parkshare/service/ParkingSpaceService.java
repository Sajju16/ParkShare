package com.parkshare.service;

import com.parkshare.dto.ParkingSpaceRequest;
import com.parkshare.dto.ParkingSpaceResponse;
import com.parkshare.entity.BookingStatus;
import com.parkshare.entity.ParkingSpace;
import com.parkshare.entity.User;
import com.parkshare.entity.VehicleType;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.ParkingSpaceRepository;
import com.parkshare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParkingSpaceService {

    private final ParkingSpaceRepository parkingSpaceRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Haversine distance helper
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Calculates the great-circle distance between two lat/lng points using the
     * Haversine formula.
     *
     * @param lat1  driver latitude
     * @param lng1  driver longitude
     * @param lat2  space latitude
     * @param lng2  space longitude
     * @return distance in kilometres, rounded to 2 decimal places
     */
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double EARTH_RADIUS_KM = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double raw = EARTH_RADIUS_KM * c;
        return Math.round(raw * 100.0) / 100.0;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CRUD operations
    // ──────────────────────────────────────────────────────────────────────────

    public ParkingSpaceResponse createParkingSpace(ParkingSpaceRequest request) {
        User user = getAuthenticatedUser();
        
        ParkingSpace space = new ParkingSpace();
        space.setOwner(user);
        mapRequestToEntity(request, space);
        
        ParkingSpace saved = parkingSpaceRepository.save(space);
        return mapToResponse(saved);
    }

    public ParkingSpaceResponse updateParkingSpace(Long id, ParkingSpaceRequest request) {
        User user = getAuthenticatedUser();
        ParkingSpace space = parkingSpaceRepository.findById(id).orElseThrow(() -> new RuntimeException("Space not found"));
        
        if (!space.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to edit this space");
        }
        
        mapRequestToEntity(request, space);
        return mapToResponse(parkingSpaceRepository.save(space));
    }

    public List<ParkingSpaceResponse> getMyParkingSpaces() {
        User user = getAuthenticatedUser();
        return parkingSpaceRepository.findByOwnerIdAndDeletedFalse(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ParkingSpaceResponse> getAvailableSpaces() {
        return parkingSpaceRepository.findByDeletedFalseAndIsAvailableTrue()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ParkingSpaceResponse> searchSpaces(String city, VehicleType vehicleType) {
        return parkingSpaceRepository.searchAvailableSpaces(city, vehicleType)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ParkingSpaceResponse getSpaceById(Long id) {
        ParkingSpace space = parkingSpaceRepository.findById(id).orElseThrow(() -> new RuntimeException("Space not found"));
        if (space.isDeleted()) throw new RuntimeException("Space not found");
        return mapToResponse(space);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // v1.1: Nearby search with Haversine distance
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Returns all available parking spaces within {@code radiusKm} of the
     * driver's current location, sorted by distance ascending.
     *
     * Only spaces that have lat/lng set are included in distance calculations.
     * Spaces without coordinates are appended at the end (distance = null).
     *
     * @param driverLat  driver's current latitude
     * @param driverLng  driver's current longitude
     * @param radiusKm   search radius in km (default 5 km if ≤ 0)
     * @param vehicleType optional vehicle type filter (null = any)
     * @return list of spaces sorted by distance from driver's location
     */
    public List<ParkingSpaceResponse> getNearbySpaces(double driverLat, double driverLng,
                                                       double radiusKm, VehicleType vehicleType) {
        double effectiveRadius = radiusKm > 0 ? radiusKm : 5.0;

        // Fetch all available spaces (optionally filtered by vehicle type)
        List<ParkingSpace> allSpaces = (vehicleType != null)
                ? parkingSpaceRepository.searchAvailableSpaces(null, vehicleType)
                : parkingSpaceRepository.findByDeletedFalseAndIsAvailableTrue();

        return allSpaces.stream()
                .map(space -> {
                    ParkingSpaceResponse resp = mapToResponse(space);
                    if (space.getLatitude() != null && space.getLongitude() != null) {
                        double dist = haversineKm(driverLat, driverLng,
                                space.getLatitude(), space.getLongitude());
                        resp.setDistanceKm(dist);
                    }
                    return resp;
                })
                // Include spaces within radius AND spaces with no coordinates (shown last)
                .filter(resp -> resp.getDistanceKm() == null || resp.getDistanceKm() <= effectiveRadius)
                // Sort: spaces with distance first (ascending), then no-location spaces
                .sorted(Comparator.comparingDouble(
                        (ParkingSpaceResponse r) -> r.getDistanceKm() != null ? r.getDistanceKm() : Double.MAX_VALUE
                ))
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Mapper helpers
    // ──────────────────────────────────────────────────────────────────────────

    private void mapRequestToEntity(ParkingSpaceRequest request, ParkingSpace space) {
        space.setTitle(request.getTitle());
        space.setDescription(request.getDescription());
        space.setAddress(request.getAddress());
        space.setCity(request.getCity());
        space.setZipCode(request.getZipCode());
        // FIX 4: Save latitude and longitude for map markers
        space.setLatitude(request.getLatitude());
        space.setLongitude(request.getLongitude());
        space.setPricePerHour(request.getPricePerHour());
        space.setPricePerDay(request.getPricePerDay());
        space.setVehicleType(request.getVehicleType());
        space.setPropertyType(request.getPropertyType());
        space.setCovered(request.isCovered());
        space.setHasEvCharging(request.isHasEvCharging());
        if (request.getImages() != null) {
            space.setImages(request.getImages());
        }
    }

    /**
     * Maps a ParkingSpace entity to its DTO response.
     * v1.1: Also resolves and populates the live currentOccupancyStatus
     * from the BookingRepository so the frontend knows if the space is
     * currently occupied (CONFIRMED / ACTIVE / OVERSTAY).
     */
    private ParkingSpaceResponse mapToResponse(ParkingSpace space) {
        // v1.1: Resolve live occupancy from active bookings
        Optional<BookingStatus> occupancy = bookingRepository.findCurrentOccupancyStatus(space.getId());
        String currentOccupancyStatus = occupancy.map(BookingStatus::name).orElse(null);

        return ParkingSpaceResponse.builder()
                .id(space.getId())
                .ownerId(space.getOwner().getId())
                .ownerName(space.getOwner().getName())
                .title(space.getTitle())
                .description(space.getDescription())
                .address(space.getAddress())
                .city(space.getCity())
                .zipCode(space.getZipCode())
                // FIX 4: Include coordinates in the response for map rendering
                .latitude(space.getLatitude())
                .longitude(space.getLongitude())
                .pricePerHour(space.getPricePerHour())
                .pricePerDay(space.getPricePerDay())
                .vehicleType(space.getVehicleType())
                .propertyType(space.getPropertyType())
                .covered(space.isCovered())
                .evCharging(space.isHasEvCharging())
                .available(space.isAvailable())
                .images(space.getImages())
                // v1.1: Live occupancy status (null = free, "CONFIRMED"/"ACTIVE"/"OVERSTAY" = occupied)
                .currentOccupancyStatus(currentOccupancyStatus)
                // distanceKm left null here; set by getNearbySpaces() when driver location is known
                .distanceKm(null)
                .build();
    }
}
