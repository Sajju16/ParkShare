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

    // ── Overlap check ─────────────────────────────────────────────────────────

    /**
     * Returns true if the parking space is blocked for any part of the
     * requested [startTime, endTime] window.
     *
     * Blocked statuses:
     *   CONFIRMED – paid, driver expected → space locked for scheduled window
     *   ACTIVE    – driver is parked       → space locked for scheduled window
     *   OVERSTAY  – driver still parked past endTime → space locked entirely
     *               (we don't know when they will actually leave)
     */
    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE b.parkingSpace.id = :spaceId " +
           "AND (" +
           "  (b.status IN (com.parkshare.entity.BookingStatus.CONFIRMED, com.parkshare.entity.BookingStatus.ACTIVE) " +
           "   AND b.startTime < :endTime AND b.endTime > :startTime) " +
           "  OR " +
           "  (b.status = com.parkshare.entity.BookingStatus.OVERSTAY)" +
           ")")
    boolean existsOverlappingBooking(@Param("spaceId") Long spaceId,
                                     @Param("startTime") LocalDateTime startTime,
                                     @Param("endTime") LocalDateTime endTime);

    // ── Live occupancy status ─────────────────────────────────────────────────

    /**
     * Returns the "live" occupancy status of a parking space.
     * A space is considered occupied if it has any booking in
     * CONFIRMED, ACTIVE, or OVERSTAY status.
     *
     * Used by the public space detail and search APIs to surface real-time
     * availability to browsing drivers — without exposing any private booking data.
     *
     * @param spaceId the ID of the parking space
     * @return the active BookingStatus (CONFIRMED / ACTIVE / OVERSTAY), or empty if free
     */
    @Query("SELECT b.status FROM Booking b " +
           "WHERE b.parkingSpace.id = :spaceId " +
           "AND b.status IN (" +
           "  com.parkshare.entity.BookingStatus.CONFIRMED, " +
           "  com.parkshare.entity.BookingStatus.ACTIVE, " +
           "  com.parkshare.entity.BookingStatus.OVERSTAY" +
           ") " +
           "ORDER BY b.startTime DESC")
    java.util.Optional<BookingStatus> findCurrentOccupancyStatus(@Param("spaceId") Long spaceId);

    // ── Basic fetch queries ───────────────────────────────────────────────────

    List<Booking> findByDriverIdOrderByStartTimeDesc(Long driverId);

    List<Booking> findByParkingSpaceOwnerIdOrderByStartTimeDesc(Long ownerId);

    @Query("SELECT b FROM Booking b WHERE b.parkingSpace.owner.id = :ownerId " +
           "AND b.status IN (com.parkshare.entity.BookingStatus.CONFIRMED, " +
           "                 com.parkshare.entity.BookingStatus.ACTIVE, " +
           "                 com.parkshare.entity.BookingStatus.OVERSTAY) " +
           "AND b.startTime <= :endOfDay AND b.endTime >= :startOfDay")
    List<Booking> findActiveBookingsForOwnerByDate(@Param("ownerId") Long ownerId,
                                                   @Param("startOfDay") LocalDateTime startOfDay,
                                                   @Param("endOfDay") LocalDateTime endOfDay);

    // ── PRD v1.0 Slice 3 – Scheduler queries ─────────────────────────────────

    /**
     * Finds PENDING bookings that have exceeded the owner-response timeout.
     * These will be transitioned to AUTO_REJECTED by the scheduler.
     *
     * @param cutoff  = now - 5 minutes
     */
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.pendingAt < :cutoff")
    List<Booking> findByStatusAndPendingAtBefore(@Param("status") BookingStatus status,
                                                  @Param("cutoff") LocalDateTime cutoff);

    /**
     * Finds AWAITING_PAYMENT bookings that have exceeded the payment timeout.
     * These will be transitioned to PAYMENT_EXPIRED by the scheduler.
     *
     * @param cutoff  = now - 10 minutes
     */
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.awaitingPaymentAt < :cutoff")
    List<Booking> findByStatusAndAwaitingPaymentAtBefore(@Param("status") BookingStatus status,
                                                          @Param("cutoff") LocalDateTime cutoff);

    /**
     * Finds ACTIVE bookings whose scheduled endTime has passed AND for which
     * the driver has NOT yet initiated a closing-OTP checkout.
     *
     * These will be transitioned to OVERSTAY by the scheduler.
     * Bookings where closingOtpCode IS NOT NULL are excluded because the driver
     * has already started the departure process.
     *
     * @param now  current timestamp
     */
    @Query("SELECT b FROM Booking b WHERE b.status = com.parkshare.entity.BookingStatus.ACTIVE " +
           "AND b.endTime < :now AND b.closingOtpCode IS NULL")
    List<Booking> findActiveBookingsExceedingEndTime(@Param("now") LocalDateTime now);
}
