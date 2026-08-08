package com.parkshare.service;

import com.parkshare.dto.BookingRequest;
import com.parkshare.dto.BookingResponse;
import com.parkshare.dto.OtpVerificationRequest;
import com.parkshare.entity.Booking;
import com.parkshare.entity.BookingStatus;
import com.parkshare.entity.ParkingSpace;
import com.parkshare.entity.User;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.PaymentRepository;
import com.parkshare.repository.ParkingSpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSpaceRepository parkingSpaceRepository;
    private final PaymentRepository paymentRepository;
    private final AuthService authService;
    private final NotificationService notificationService;

    /** Max wrong attempts for either OTP before verification is locked. */
    private static final int MAX_OTP_ATTEMPTS = 3;

    /** Cryptographically-secure random for OTP generation. */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // ──────────────────────────────────────────────────────────────────────────
    // PRD v1.0 – Booking date-window helper
    // ──────────────────────────────────────────────────────────────────────────

    private void validateBookingDateWindow(LocalDateTime startTime, LocalDateTime endTime) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDate tomorrow = today.plusDays(1);

        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("End time must be strictly after start time.");
        }
        if (!startTime.isAfter(now)) {
            throw new IllegalArgumentException(
                    "Start time must be in the future. Bookings cannot start in the past or at the current moment.");
        }
        LocalDate startDate = startTime.toLocalDate();
        if (!startDate.equals(today) && !startDate.equals(tomorrow)) {
            throw new IllegalArgumentException(
                    "Bookings are only allowed for today (" + today + ") or tomorrow (" + tomorrow
                            + "). Requested start date: " + startDate);
        }
        LocalDate endDate = endTime.toLocalDate();
        if (!endDate.equals(today) && !endDate.equals(tomorrow)) {
            throw new IllegalArgumentException(
                    "Bookings are only allowed for today (" + today + ") or tomorrow (" + tomorrow
                            + "). Requested end date: " + endDate);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRD v1.0 Slice 2 – OTP generation
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Generates a 4-digit numeric OTP using a cryptographically-secure RNG
     * and persists it on the booking.
     * Called internally by PaymentService after a successful payment.
     */
    @Transactional
    public void generateOtp(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // Only generate OTP for CONFIRMED bookings
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("OTP can only be generated for CONFIRMED bookings.");
        }

        // Generate a 4-digit code: 0000-9999
        String otp = String.format("%04d", SECURE_RANDOM.nextInt(10000));
        booking.setOtpCode(otp);
        booking.setOtpAttempts(0);
        bookingRepository.save(booking);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRD v1.0 Slice 2 – OTP verification
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Owner submits the OTP the driver showed them.
     *
     * Business rules:
     * - Booking must be in CONFIRMED status.
     * - After 3 wrong attempts the booking is locked (further calls throw).
     * - Correct OTP → ACTIVE.
     * - Wrong OTP → attempts counter incremented, stays CONFIRMED.
     */
    @Transactional
    public BookingResponse verifyOtp(Long bookingId, OtpVerificationRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        User owner = authService.getCurrentUser();
        if (!booking.getParkingSpace().getOwner().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized: you do not own this parking space.");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("OTP verification is only allowed for CONFIRMED bookings.");
        }

        // Lock check – prevent verification after 3 failed attempts
        if (booking.getOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new RuntimeException(
                    "OTP verification is locked after " + MAX_OTP_ATTEMPTS
                            + " incorrect attempts. Please contact support.");
        }

        // Compare OTPs
        if (booking.getOtpCode() != null && booking.getOtpCode().equals(request.getOtpCode())) {
            // ✅ Correct OTP → CONFIRMED → ACTIVE
            booking.setStatus(BookingStatus.ACTIVE);
            bookingRepository.save(booking);
            return mapToOwnerResponse(booking);
        } else {
            // ❌ Wrong OTP → increment attempts, stay CONFIRMED
            booking.setOtpAttempts(booking.getOtpAttempts() + 1);
            bookingRepository.save(booking);

            int remaining = MAX_OTP_ATTEMPTS - booking.getOtpAttempts();
            String message = remaining > 0
                    ? "Incorrect OTP. " + remaining + " attempt(s) remaining."
                    : "Incorrect OTP. No more attempts allowed. Verification is now locked.";
            throw new RuntimeException(message);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRD v1.1 – Closing OTP: initiate checkout
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Driver signals they are ready to leave.
     * Generates a 4-digit closing OTP and returns it to the driver.
     * Booking must be ACTIVE or OVERSTAY.
     */
    @Transactional
    public BookingResponse initiateCheckout(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        User driver = authService.getCurrentUser();
        if (!booking.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("Unauthorized: you do not own this booking.");
        }

        if (booking.getStatus() != BookingStatus.ACTIVE
                && booking.getStatus() != BookingStatus.OVERSTAY) {
            throw new IllegalStateException(
                    "Checkout can only be initiated for ACTIVE or OVERSTAY bookings.");
        }

        if (booking.getClosingOtpCode() != null) {
            // Idempotent: if already initiated, just return current state
            return mapToDriverResponse(booking);
        }

        String closingOtp = String.format("%04d", SECURE_RANDOM.nextInt(10000));
        booking.setClosingOtpCode(closingOtp);
        booking.setClosingOtpAttempts(0);
        booking = bookingRepository.save(booking);

        // Notify owner that the driver is ready to leave
        notificationService.sendNotification(
                booking.getParkingSpace().getOwner().getEmail(),
                "Driver Ready to Leave — Closing OTP Required",
                "The driver for booking #" + booking.getId() + " at \""
                        + booking.getParkingSpace().getTitle()
                        + "\" has initiated checkout. Ask them for their 4-digit closing OTP "
                        + "and verify it in your Bookings dashboard to release the space."
        );

        return mapToDriverResponse(booking);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRD v1.1 – Closing OTP: owner verification → COMPLETED
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Owner submits the closing OTP the departing driver shows them.
     *
     * Business rules:
     * - Booking must be ACTIVE or OVERSTAY.
     * - Driver must have already called initiateCheckout (closingOtpCode != null).
     * - After 3 wrong attempts verification is locked.
     * - Correct OTP → COMPLETED + overstay charge calculated.
     * - Wrong OTP → closingOtpAttempts incremented, status unchanged.
     */
    @Transactional
    public BookingResponse verifyClosingOtp(Long bookingId, OtpVerificationRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        User owner = authService.getCurrentUser();
        if (!booking.getParkingSpace().getOwner().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized: you do not own this parking space.");
        }

        if (booking.getStatus() != BookingStatus.ACTIVE
                && booking.getStatus() != BookingStatus.OVERSTAY) {
            throw new RuntimeException(
                    "Closing OTP verification is only allowed for ACTIVE or OVERSTAY bookings.");
        }

        if (booking.getClosingOtpCode() == null) {
            throw new RuntimeException(
                    "Driver has not yet initiated checkout. Ask the driver to click 'I'm Ready to Leave' first.");
        }

        if (booking.getClosingOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new RuntimeException(
                    "Closing OTP verification is locked after " + MAX_OTP_ATTEMPTS
                            + " incorrect attempts. Please contact support.");
        }

        if (booking.getClosingOtpCode().equals(request.getOtpCode())) {
            // ✅ Correct closing OTP → COMPLETED
            LocalDateTime closedAt = LocalDateTime.now();
            booking.setStatus(BookingStatus.COMPLETED);
            booking.setActualClosedAt(closedAt);

            // Calculate overstay extra charge (if the booking entered OVERSTAY state)
            if (booking.getOverstayStartedAt() != null) {
                long overstayMinutes = Duration.between(booking.getOverstayStartedAt(), closedAt).toMinutes();
                if (overstayMinutes > 0) {
                    double ratePerMinute = booking.getParkingSpace().getPricePerHour() / 60.0;
                    double extraCharge = Math.round(overstayMinutes * ratePerMinute * 100.0) / 100.0;
                    booking.setOverstayExtraCharge(extraCharge);

                    // Update the existing payment record with overstay amount
                    paymentRepository.findByBookingId(bookingId).ifPresent(payment -> {
                        payment.setOverstayAmount(extraCharge);
                        paymentRepository.save(payment);
                    });
                }
            }

            booking = bookingRepository.save(booking);

            notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Departure Confirmed — Thank You!",
                    "Your departure from \"" + booking.getParkingSpace().getTitle()
                            + "\" has been confirmed. "
                            + (booking.getOverstayExtraCharge() != null && booking.getOverstayExtraCharge() > 0
                                ? "An overstay charge of $" + String.format("%.2f", booking.getOverstayExtraCharge()) + " has been recorded."
                                : "Thank you for using ParkShare!")
            );

            notificationService.sendNotification(
                    booking.getParkingSpace().getOwner().getEmail(),
                    "Space Released — Booking #" + booking.getId() + " COMPLETED",
                    "The driver has confirmed departure from \"" + booking.getParkingSpace().getTitle()
                            + "\". The space is now available."
                            + (booking.getOverstayExtraCharge() != null && booking.getOverstayExtraCharge() > 0
                                ? " Overstay charge: $" + String.format("%.2f", booking.getOverstayExtraCharge()) + "."
                                : "")
            );

            return mapToOwnerResponse(booking);
        } else {
            // ❌ Wrong closing OTP
            booking.setClosingOtpAttempts(booking.getClosingOtpAttempts() + 1);
            bookingRepository.save(booking);

            int remaining = MAX_OTP_ATTEMPTS - booking.getClosingOtpAttempts();
            String message = remaining > 0
                    ? "Incorrect closing OTP. " + remaining + " attempt(s) remaining."
                    : "Incorrect closing OTP. No more attempts allowed. Verification is now locked.";
            throw new RuntimeException(message);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Create booking
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        validateBookingDateWindow(request.getStartTime(), request.getEndTime());

        User driver = authService.getCurrentUser();
        ParkingSpace space = parkingSpaceRepository.findById(request.getParkingSpaceId())
                .orElseThrow(() -> new RuntimeException("Parking space not found"));

        if (!space.isAvailable() || space.isDeleted()) {
            throw new RuntimeException("Parking space is not available for booking");
        }
        if (space.getOwner().getId().equals(driver.getId())) {
            throw new RuntimeException("Owners cannot book their own parking spaces");
        }

        boolean hasOverlap = bookingRepository.existsOverlappingBooking(
                space.getId(), request.getStartTime(), request.getEndTime());
        if (hasOverlap) {
            throw new RuntimeException("The parking space is already booked during the selected time period.");
        }

        long hours = Duration.between(request.getStartTime(), request.getEndTime()).toHours();
        if (hours < 1) hours = 1;
        double totalPrice = hours * space.getPricePerHour();

        Booking booking = new Booking();
        booking.setDriver(driver);
        booking.setParkingSpace(space);
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setTotalPrice(totalPrice);
        booking.setStatus(BookingStatus.PENDING);
        booking.setPendingAt(LocalDateTime.now());

        booking = bookingRepository.save(booking);
        return mapToDriverResponse(booking);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Read operations
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Driver fetches their own bookings.
     * The OTP is included in the response so the driver can show it.
     */
    public List<BookingResponse> getDriverBookings() {
        User driver = authService.getCurrentUser();
        return bookingRepository.findByDriverIdOrderByStartTimeDesc(driver.getId())
                .stream()
                .map(this::mapToDriverResponse)
                .collect(Collectors.toList());
    }

    /**
     * Owner fetches bookings for their parking spaces.
     * The OTP is NEVER included in this response.
     */
    public List<BookingResponse> getOwnerBookings() {
        User owner = authService.getCurrentUser();
        return bookingRepository.findByParkingSpaceOwnerIdOrderByStartTimeDesc(owner.getId())
                .stream()
                .map(this::mapToOwnerResponse)
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Cancel
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        User currentUser = authService.getCurrentUser();
        boolean isDriver = booking.getDriver().getId().equals(currentUser.getId());
        boolean isOwner = booking.getParkingSpace().getOwner().getId().equals(currentUser.getId());

        if (!isDriver && !isOwner) {
            throw new RuntimeException("You don't have permission to cancel this booking");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking is already cancelled");
        }
        if (booking.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot cancel a booking that has already started or passed");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        return isDriver ? mapToDriverResponse(booking) : mapToOwnerResponse(booking);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Accept / Reject
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse acceptBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        User owner = authService.getCurrentUser();

        if (!booking.getParkingSpace().getOwner().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized to accept this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Can only accept PENDING bookings");
        }

        boolean hasOverlap = bookingRepository.existsOverlappingBooking(
                booking.getParkingSpace().getId(), booking.getStartTime(), booking.getEndTime());
        if (hasOverlap) {
            throw new RuntimeException(
                    "Cannot accept this booking because it overlaps with an existing confirmed booking.");
        }

        booking.setStatus(BookingStatus.AWAITING_PAYMENT);
        booking.setAwaitingPaymentAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);

        notificationService.sendNotification(
                booking.getDriver().getEmail(),
                "Booking Accepted – Payment Required",
                "Your booking for " + booking.getParkingSpace().getTitle()
                        + " has been accepted. Please complete payment to confirm it.");

        return mapToOwnerResponse(booking);
    }

    @Transactional
    public BookingResponse rejectBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        User owner = authService.getCurrentUser();

        if (!booking.getParkingSpace().getOwner().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized to reject this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Can only reject PENDING bookings");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking = bookingRepository.save(booking);

        notificationService.sendNotification(
                booking.getDriver().getEmail(),
                "Booking Rejected",
                "Your booking for " + booking.getParkingSpace().getTitle() + " has been rejected.");

        return mapToOwnerResponse(booking);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Owner stats
    // ──────────────────────────────────────────────────────────────────────────

    public com.parkshare.dto.OwnerStatsResponse getOwnerStats() {
        User owner = authService.getCurrentUser();
        LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.now().with(LocalTime.MAX);

        List<Booking> activeToday = bookingRepository.findActiveBookingsForOwnerByDate(
                owner.getId(), startOfDay, endOfDay);

        Double todayRevenue = activeToday.stream()
                .mapToDouble(Booking::getTotalPrice)
                .sum();

        List<Booking> allOwnerBookings = bookingRepository
                .findByParkingSpaceOwnerIdOrderByStartTimeDesc(owner.getId());
        long pendingRequests = allOwnerBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING).count();

        return com.parkshare.dto.OwnerStatsResponse.builder()
                .todayRevenueEstimate(todayRevenue)
                .activeOccupancy(activeToday.size())
                .pendingRequests((int) pendingRequests)
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Mappers – security-aware
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Driver-facing mapper:
     * - Includes opening otpCode when status is CONFIRMED or ACTIVE.
     * - Includes closing otpCode when status is ACTIVE/OVERSTAY and driver has initiated checkout.
     * - Includes overstay fields for transparency.
     */
    private BookingResponse mapToDriverResponse(Booking booking) {
        BookingResponse r = buildBaseResponse(booking);

        // Opening OTP: show to driver during CONFIRMED and ACTIVE
        if (booking.getStatus() == BookingStatus.CONFIRMED
                || booking.getStatus() == BookingStatus.ACTIVE
                || booking.getStatus() == BookingStatus.OVERSTAY) {
            r.setOtpCode(booking.getOtpCode());
        }
        r.setOtpAttempts(booking.getOtpAttempts());

        // Closing OTP: show to driver when checkout has been initiated (ACTIVE or OVERSTAY)
        if ((booking.getStatus() == BookingStatus.ACTIVE
                || booking.getStatus() == BookingStatus.OVERSTAY)
                && booking.getClosingOtpCode() != null) {
            r.setClosingOtpCode(booking.getClosingOtpCode());
        }
        r.setClosingOtpAttempts(booking.getClosingOtpAttempts());

        return r;
    }

    /**
     * Owner-facing mapper:
     * - NEVER includes either OTP value (opening or closing).
     * - Includes attempt counters so the owner UI can show remaining tries.
     * - Includes overstay fields so owner can see extra charge.
     */
    private BookingResponse mapToOwnerResponse(Booking booking) {
        BookingResponse r = buildBaseResponse(booking);
        r.setOtpCode(null);         // explicit null – opening OTP never sent to owner
        r.setClosingOtpCode(null);  // explicit null – closing OTP never sent to owner
        r.setOtpAttempts(booking.getOtpAttempts());
        r.setClosingOtpAttempts(booking.getClosingOtpAttempts());
        return r;
    }

    /** Common fields shared by both driver and owner responses. */
    private BookingResponse buildBaseResponse(Booking booking) {
        BookingResponse r = new BookingResponse();
        r.setId(booking.getId());
        r.setParkingSpaceId(booking.getParkingSpace().getId());
        r.setParkingSpaceTitle(booking.getParkingSpace().getTitle());
        r.setParkingSpaceAddress(
                booking.getParkingSpace().getAddress() + ", " + booking.getParkingSpace().getCity());
        r.setDriverId(booking.getDriver().getId());
        r.setDriverName(booking.getDriver().getName());
        r.setStartTime(booking.getStartTime());
        r.setEndTime(booking.getEndTime());
        r.setTotalPrice(booking.getTotalPrice());
        r.setStatus(booking.getStatus());
        r.setCreatedAt(booking.getCreatedAt());
        // Overstay fields (safe to expose to both driver and owner)
        r.setOverstayStartedAt(booking.getOverstayStartedAt());
        r.setActualClosedAt(booking.getActualClosedAt());
        r.setOverstayExtraCharge(booking.getOverstayExtraCharge());
        return r;
    }
}
