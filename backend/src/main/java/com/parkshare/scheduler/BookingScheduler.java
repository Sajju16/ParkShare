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
 * PRD v1.0 — Slice 3: Booking Lifecycle Scheduler
 *
 * Automatically enforces the booking time-box rules defined in the PRD:
 *
 *   PENDING          → AUTO_REJECTED   after  5 min  (owner didn't respond)
 *   AWAITING_PAYMENT → PAYMENT_EXPIRED after 10 min  (driver didn't pay)
 *   ACTIVE           → COMPLETED       when endTime is in the past
 *
 * Each job runs every 60 seconds (fixedDelay = 60_000 ms after the previous
 * run completes), with an initial delay of 30 seconds on startup to allow
 * the application context to fully initialise.
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
    // Task 1: AUTO_REJECT stale PENDING bookings
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Finds every PENDING booking whose {@code pendingAt} timestamp is more
     * than {@value PENDING_TIMEOUT_MINUTES} minutes in the past, and transitions
     * it to AUTO_REJECTED.
     *
     * <p>Runs every 60 seconds after application startup (initial delay 30 s).
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    @Transactional
    public void autoRejectExpiredPendingBookings() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(PENDING_TIMEOUT_MINUTES);

        List<Booking> expired = bookingRepository.findByStatusAndPendingAtBefore(
                BookingStatus.PENDING, cutoff);

        if (expired.isEmpty()) {
            return; // nothing to do — skip logging to avoid noise
        }

        log.info("[Scheduler] AUTO_REJECT: {} PENDING booking(s) exceeded {}‑minute timeout",
                expired.size(), PENDING_TIMEOUT_MINUTES);

        for (Booking booking : expired) {
            booking.setStatus(BookingStatus.AUTO_REJECTED);
            bookingRepository.save(booking);

            log.debug("[Scheduler] Booking #{} AUTO_REJECTED (space: {}, driver: {})",
                    booking.getId(),
                    booking.getParkingSpace().getTitle(),
                    booking.getDriver().getEmail());

            // Notify driver that their booking was auto-rejected
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
    // Task 2: PAYMENT_EXPIRED stale AWAITING_PAYMENT bookings
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Finds every AWAITING_PAYMENT booking whose {@code awaitingPaymentAt}
     * timestamp is more than {@value PAYMENT_TIMEOUT_MINUTES} minutes in the
     * past, and transitions it to PAYMENT_EXPIRED.
     *
     * <p>Runs every 60 seconds after application startup (initial delay 30 s).
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

        log.info("[Scheduler] PAYMENT_EXPIRED: {} AWAITING_PAYMENT booking(s) exceeded {}‑minute timeout",
                expired.size(), PAYMENT_TIMEOUT_MINUTES);

        for (Booking booking : expired) {
            booking.setStatus(BookingStatus.PAYMENT_EXPIRED);
            bookingRepository.save(booking);

            log.debug("[Scheduler] Booking #{} PAYMENT_EXPIRED (space: {}, driver: {})",
                    booking.getId(),
                    booking.getParkingSpace().getTitle(),
                    booking.getDriver().getEmail());

            // Notify driver that their payment window expired
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
    // Task 3: COMPLETE expired ACTIVE bookings
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Finds every ACTIVE booking whose {@code endTime} is in the past, and
     * transitions it to COMPLETED.
     *
     * <p>This is the normal happy-path terminal state. The driver has used the
     * space and the session is now over.
     *
     * <p>Runs every 60 seconds after application startup (initial delay 30 s).
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    @Transactional
    public void completeExpiredActiveBookings() {
        LocalDateTime now = LocalDateTime.now();

        List<Booking> completed = bookingRepository.findByStatusAndEndTimeBefore(
                BookingStatus.ACTIVE, now);

        if (completed.isEmpty()) {
            return;
        }

        log.info("[Scheduler] COMPLETED: {} ACTIVE booking(s) have passed their end time",
                completed.size());

        for (Booking booking : completed) {
            booking.setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(booking);

            log.debug("[Scheduler] Booking #{} COMPLETED (space: {}, driver: {})",
                    booking.getId(),
                    booking.getParkingSpace().getTitle(),
                    booking.getDriver().getEmail());

            // Notify driver that their session has ended
            notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Booking Completed",
                    "Your parking session at \"" + booking.getParkingSpace().getTitle()
                            + "\" has ended. Thank you for using ParkShare!"
            );
        }
    }
}
