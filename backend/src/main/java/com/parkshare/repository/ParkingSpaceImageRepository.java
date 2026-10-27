package com.parkshare.repository;

import com.parkshare.entity.ParkingSpaceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSpaceImageRepository extends JpaRepository<ParkingSpaceImage, Long> {

    List<ParkingSpaceImage> findByParkingSpaceIdAndDeletedFalse(Long parkingSpaceId);

    @Query("SELECT img FROM ParkingSpaceImage img WHERE img.id = :id AND img.deleted = false")
    Optional<ParkingSpaceImage> findActiveById(@Param("id") Long id);
}
