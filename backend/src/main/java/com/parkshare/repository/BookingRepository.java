package com.parkshare.repository;

import com.parkshare.entity.Booking;
import com.parkshare.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE b.parkingSpace.id = :spaceId " +
           "AND b.status = 'CONFIRMED' " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    boolean existsOverlappingBooking(@Param("spaceId") Long spaceId, 
                                     @Param("startTime") LocalDateTime startTime, 
                                     @Param("endTime") LocalDateTime endTime);

    List<Booking> findByDriverIdOrderByStartTimeDesc(Long driverId);

    List<Booking> findByParkingSpaceOwnerIdOrderByStartTimeDesc(Long ownerId);

    @Query("SELECT b FROM Booking b WHERE b.parkingSpace.owner.id = :ownerId " +
           "AND b.status = 'CONFIRMED' " +
           "AND b.startTime <= :endOfDay AND b.endTime >= :startOfDay")
    List<Booking> findActiveBookingsForOwnerByDate(@Param("ownerId") Long ownerId, 
                                                   @Param("startOfDay") LocalDateTime startOfDay, 
                                                   @Param("endOfDay") LocalDateTime endOfDay);
}
