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
           "AND b.status IN (com.parkshare.entity.BookingStatus.CONFIRMED, com.parkshare.entity.BookingStatus.ACTIVE) " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    boolean existsOverlappingBooking(@Param("spaceId") Long spaceId,
                                     @Param("startTime") LocalDateTime startTime,
                                     @Param("endTime") LocalDateTime endTime);

    List<Booking> findByDriverIdOrderByStartTimeDesc(Long driverId);

    List<Booking> findByParkingSpaceOwnerIdOrderByStartTimeDesc(Long ownerId);

    @Query("SELECT b FROM Booking b WHERE b.parkingSpace.owner.id = :ownerId " +
           "AND b.status IN (com.parkshare.entity.BookingStatus.CONFIRMED, com.parkshare.entity.BookingStatus.ACTIVE) " +
           "AND b.startTime <= :endOfDay AND b.endTime >= :startOfDay")
    List<Booking> findActiveBookingsForOwnerByDate(@Param("ownerId") Long ownerId,
                                                   @Param("startOfDay") LocalDateTime startOfDay,
                                                   @Param("endOfDay") LocalDateTime endOfDay);

    // ── PRD v1.0 Slice 3 – Scheduler queries ─────────────────────────────────

    /**
     * Finds PENDING bookings that have exceeded the owner-response timeout.
     * These will be transitioned to AUTO_REJECTED by the scheduler.
     *
     * @param cutoff  = now - 5 minutes (the maximum allowed response time)
     */
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.pendingAt < :cutoff")
    List<Booking> findByStatusAndPendingAtBefore(@Param("status") BookingStatus status,
                                                  @Param("cutoff") LocalDateTime cutoff);

    /**
     * Finds AWAITING_PAYMENT bookings that have exceeded the payment timeout.
     * These will be transitioned to PAYMENT_EXPIRED by the scheduler.
     *
     * @param cutoff  = now - 10 minutes (the maximum allowed payment window)
     */
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.awaitingPaymentAt < :cutoff")
    List<Booking> findByStatusAndAwaitingPaymentAtBefore(@Param("status") BookingStatus status,
                                                          @Param("cutoff") LocalDateTime cutoff);

    /**
     * Finds ACTIVE bookings whose end time has passed.
     * These will be transitioned to COMPLETED by the scheduler.
     *
     * @param now  current timestamp
     */
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.endTime < :now")
    List<Booking> findByStatusAndEndTimeBefore(@Param("status") BookingStatus status,
                                                @Param("now") LocalDateTime now);
}
