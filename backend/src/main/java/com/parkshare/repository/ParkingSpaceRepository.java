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
}
