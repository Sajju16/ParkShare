package com.parkshare.scheduler;

import com.parkshare.entity.Booking;
import com.parkshare.entity.BookingStatus;
import com.parkshare.repository.BookingRepository;
import com.parkshare.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ParkShare Booking Lifecycle Scheduler
 *
 * Enforces time-box rules and overstay detection:
 *
 *   PENDING          → AUTO_REJECTED   after  5 min  (owner didn't respond)
 *   AWAITING_PAYMENT → PAYMENT_EXPIRED after 10 min  (driver didn't pay)
 *   ACTIVE           → OVERSTAY        when endTime passes + no closing OTP initiated
 *
 * IMPORTANT: The scheduler NO LONGER auto-completes ACTIVE bookings to COMPLETED.
 * COMPLETED is exclusively triggered by successful closing OTP verification.
 *
 * Each job runs every 60 seconds (fixedDelay = 60_000 ms after the previous
 * run completes), with an initial delay of 30 seconds on startup.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    /** PRD rule: Owner must respond within 5 minutes. */
    private static final long PENDING_TIMEOUT_MINUTES = 5;

    /** PRD rule: Driver must complete payment within 10 minutes. */
    private static final long PAYMENT_TIMEOUT_MINUTES = 10;

    // ──────────────────────────────────────────────────────────────────────────
    // Task 1: AUTO_REJECT stale PENDING bookings  (UNCHANGED)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Finds every PENDING booking whose {@code pendingAt} timestamp is more
     * than {@value PENDING_TIMEOUT_MINUTES} minutes in the past, and transitions
     * it to AUTO_REJECTED.
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    @Transactional
    public void autoRejectExpiredPendingBookings() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(PENDING_TIMEOUT_MINUTES);

        List<Booking> expired = bookingRepository.findByStatusAndPendingAtBefore(
                BookingStatus.PENDING, cutoff);

        if (expired.isEmpty()) {
            return;
        }

        log.info("[Scheduler] AUTO_REJECT: {} PENDING booking(s) exceeded {}-minute timeout",
                expired.size(), PENDING_TIMEOUT_MINUTES);

        for (Booking booking : expired) {
            booking.setStatus(BookingStatus.AUTO_REJECTED);
            bookingRepository.save(booking);

            log.debug("[Scheduler] Booking #{} AUTO_REJECTED (space: {}, driver: {})",
                    booking.getId(),
                    booking.getParkingSpace().getTitle(),
                    booking.getDriver().getEmail());

            notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Booking Request Expired",
                    "Your booking request for \"" + booking.getParkingSpace().getTitle()
                            + "\" was not responded to within " + PENDING_TIMEOUT_MINUTES
                            + " minutes and has been automatically cancelled."
            );
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Task 2: PAYMENT_EXPIRED stale AWAITING_PAYMENT bookings  (UNCHANGED)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Finds every AWAITING_PAYMENT booking whose {@code awaitingPaymentAt}
     * timestamp is more than {@value PAYMENT_TIMEOUT_MINUTES} minutes in the
     * past, and transitions it to PAYMENT_EXPIRED.
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    @Transactional
    public void expirePaymentTimeoutBookings() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(PAYMENT_TIMEOUT_MINUTES);

        List<Booking> expired = bookingRepository.findByStatusAndAwaitingPaymentAtBefore(
                BookingStatus.AWAITING_PAYMENT, cutoff);

        if (expired.isEmpty()) {
            return;
        }

        log.info("[Scheduler] PAYMENT_EXPIRED: {} AWAITING_PAYMENT booking(s) exceeded {}-minute timeout",
                expired.size(), PAYMENT_TIMEOUT_MINUTES);

        for (Booking booking : expired) {
            booking.setStatus(BookingStatus.PAYMENT_EXPIRED);
            bookingRepository.save(booking);

            log.debug("[Scheduler] Booking #{} PAYMENT_EXPIRED (space: {}, driver: {})",
                    booking.getId(),
                    booking.getParkingSpace().getTitle(),
                    booking.getDriver().getEmail());

            notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Payment Window Expired",
                    "Your payment window for \"" + booking.getParkingSpace().getTitle()
                            + "\" expired after " + PAYMENT_TIMEOUT_MINUTES
                            + " minutes. The booking has been cancelled. Please create a new booking if you still need parking."
            );
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Task 3: OVERSTAY detection — ACTIVE → OVERSTAY when endTime passes
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Finds every ACTIVE booking whose scheduled {@code endTime} is in the past
     * AND whose closing OTP has NOT yet been initiated by the driver.
     *
     * <p>Transitions those bookings to OVERSTAY, preserving the space as physically
     * occupied. The booking will only reach COMPLETED when the owner successfully
     * verifies the driver's closing OTP.
     *
     * <p>NOTE: Bookings where {@code closingOtpCode} is already set are excluded —
     * the driver has initiated checkout and the owner just needs to verify.
     * Those bookings remain ACTIVE until the closing OTP is verified.
     *
     * <p>Runs every 60 seconds after application startup (initial delay 30 s).
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    @Transactional
    public void transitionOverstayBookings() {
        LocalDateTime now = LocalDateTime.now();

        List<Booking> overdue = bookingRepository.findActiveBookingsExceedingEndTime(now);

        if (overdue.isEmpty()) {
            return;
        }

        log.info("[Scheduler] OVERSTAY: {} ACTIVE booking(s) have exceeded their scheduled end time",
                overdue.size());

        for (Booking booking : overdue) {
            booking.setStatus(BookingStatus.OVERSTAY);
            // overstayStartedAt is set to the SCHEDULED endTime, not to "now",
            // so extra charges are calculated from the exact agreed departure time.
            booking.setOverstayStartedAt(booking.getEndTime());
            bookingRepository.save(booking);

            log.warn("[Scheduler] Booking #{} → OVERSTAY (space: \"{}\", driver: {}, was due: {})",
                    booking.getId(),
                    booking.getParkingSpace().getTitle(),
                    booking.getDriver().getEmail(),
                    booking.getEndTime());

            // Notify driver: they need to provide their closing OTP
            notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Your Parking Time Has Ended — Please Confirm Departure",
                    "Your scheduled parking time at \"" + booking.getParkingSpace().getTitle()
                            + "\" has ended. Please click 'I'm Ready to Leave' in the app and "
                            + "provide your closing OTP to the owner to confirm your departure. "
                            + "Extra charges are accumulating until you do so."
            );

            // Notify owner: the driver is overdue
            notificationService.sendNotification(
                    booking.getParkingSpace().getOwner().getEmail(),
                    "Driver Overstay Alert — Booking #" + booking.getId(),
                    "The driver for booking #" + booking.getId() + " at \""
                            + booking.getParkingSpace().getTitle()
                            + "\" has exceeded their scheduled time. "
                            + "Please ask them to confirm departure via closing OTP."
            );
        }
    }
}
