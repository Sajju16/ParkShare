package com.parkshare.repository;

import com.parkshare.entity.ParkingSpace;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ParkingSpaceRepository extends JpaRepository<ParkingSpace, Long> {
    List<ParkingSpace> findByOwnerIdAndDeletedFalse(Long ownerId);
    List<ParkingSpace> findByDeletedFalseAndIsAvailableTrue();

    @Query("SELECT p FROM ParkingSpace p WHERE p.deleted = false AND p.isAvailable = true " +
           "AND (:city IS NULL OR LOWER(p.city) LIKE LOWER(CONCAT('%', :city, '%'))) " +
           "AND (:vehicleType IS NULL OR p.vehicleType = :vehicleType)")
    List<ParkingSpace> searchAvailableSpaces(@Param("city") String city, 
                                             @Param("vehicleType") com.parkshare.entity.VehicleType vehicleType);

    /**
     * v1.3: Advanced multi-criteria search for parking spaces.
     * Matches query substring against title, address, or city (case-insensitive).
     * Filters by vehicleType, price range (minPrice, maxPrice), and covered status.
     */
    @Query("SELECT p FROM ParkingSpace p WHERE p.deleted = false AND p.isAvailable = true " +
           "AND (:q IS NULL OR :q = '' OR " +
           "     LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "     LOWER(p.address) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "     LOWER(p.city) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND (:vehicleType IS NULL OR p.vehicleType = :vehicleType) " +
           "AND (:minPrice IS NULL OR p.pricePerHour >= :minPrice) " +
           "AND (:maxPrice IS NULL OR p.pricePerHour <= :maxPrice) " +
           "AND (:covered IS NULL OR p.isCovered = :covered)")
    List<ParkingSpace> searchSpacesAdvanced(
            @Param("q") String q,
            @Param("vehicleType") com.parkshare.entity.VehicleType vehicleType,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice,
            @Param("covered") Boolean covered);
}
