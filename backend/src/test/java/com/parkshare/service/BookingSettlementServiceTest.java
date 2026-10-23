package com.parkshare.service;

import com.parkshare.dto.BookingResponse;
import com.parkshare.dto.OtpVerificationRequest;
import com.parkshare.entity.*;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.ParkingSpaceRepository;
import com.parkshare.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingSettlementServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ParkingSpaceRepository parkingSpaceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private AuthService authService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    private User owner;
    private User driver;
    private ParkingSpace space;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(10L);
        owner.setName("Test Owner");
        owner.setEmail("owner@example.com");
        owner.setRole(Role.OWNER);

        driver = new User();
        driver.setId(20L);
        driver.setName("Test Driver");
        driver.setEmail("driver@example.com");
        driver.setRole(Role.DRIVER);

        space = new ParkingSpace();
        space.setId(100L);
        space.setTitle("Downtown Spot");
        space.setAddress("456 Market St");
        space.setCity("Metropolis");
        space.setPricePerHour(50.0);
        space.setOwner(owner);
    }

    @Test
    void testVerifyOtp_CheckInTooEarly_ThrowsIllegalArgumentException() {
        Booking booking = new Booking();
        booking.setId(1L);
        booking.setParkingSpace(space);
        booking.setDriver(driver);
        // Scheduled for tomorrow at 10:00 AM (more than 15 minutes in the future)
        booking.setStartTime(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0));
        booking.setEndTime(booking.getStartTime().plusHours(2));
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setOtpCode("1234");
        booking.setOtpAttempts(0);

        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(authService.getCurrentUser()).thenReturn(owner);

        OtpVerificationRequest request = new OtpVerificationRequest();
        request.setOtpCode("1234");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            bookingService.verifyOtp(1L, request);
        });

        assertTrue(ex.getMessage().contains("Check-in is only allowed up to 15 minutes before the scheduled start time"));
        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        assertNull(booking.getActualCheckInAt());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void testVerifyClosingOtp_OnTimeCheckout_SettlesFullAmount() {
        LocalDateTime scheduledStart = LocalDateTime.now().minusMinutes(120);
        LocalDateTime scheduledEnd = LocalDateTime.now();

        Booking booking = new Booking();
        booking.setId(2L);
        booking.setParkingSpace(space);
        booking.setDriver(driver);
        booking.setStartTime(scheduledStart);
        booking.setEndTime(scheduledEnd);
        booking.setTotalPrice(100.0); // 2 hours @ 50/hr
        booking.setStatus(BookingStatus.ACTIVE);
        booking.setActualCheckInAt(scheduledStart);
        booking.setClosingOtpCode("5678");
        booking.setClosingOtpAttempts(0);

        Payment payment = new Payment();
        payment.setId(200L);
        payment.setBooking(booking);
        payment.setAmount(100.0);
        payment.setCommission(10.0);
        payment.setOwnerEarnings(90.0);
        payment.setStatus("SUCCESS");

        when(bookingRepository.findById(2L)).thenReturn(Optional.of(booking));
        when(authService.getCurrentUser()).thenReturn(owner);
        when(paymentRepository.findByBookingId(2L)).thenReturn(Optional.of(payment));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OtpVerificationRequest request = new OtpVerificationRequest();
        request.setOtpCode("5678");

        BookingResponse response = bookingService.verifyClosingOtp(2L, request);

        assertEquals(BookingStatus.COMPLETED, response.getStatus());
        assertEquals(100.0, response.getActualUsageCharge(), 0.01);
        assertEquals(0.0, response.getRefundAdjustment(), 0.01);

        // Verify Payment reconciliation
        assertEquals(100.0, payment.getAmount(), 0.01, "Original amount preserved");
        assertEquals(100.0, payment.getSettledAmount(), 0.01, "Settled amount equals full usage");
        assertEquals(0.0, payment.getRefundAdjustment(), 0.01);
        assertEquals(10.0, payment.getCommission(), 0.01);
        assertEquals(90.0, payment.getOwnerEarnings(), 0.01);
        verify(paymentRepository).save(payment);
    }

    @Test
    void testVerifyClosingOtp_EarlyCheckout_EnforcesOneHourMinimum() {
        LocalDateTime checkIn = LocalDateTime.now().minusMinutes(15);
        LocalDateTime scheduledStart = LocalDateTime.now().minusMinutes(15);
        LocalDateTime scheduledEnd = scheduledStart.plusHours(2);

        Booking booking = new Booking();
        booking.setId(3L);
        booking.setParkingSpace(space);
        booking.setDriver(driver);
        booking.setStartTime(scheduledStart);
        booking.setEndTime(scheduledEnd);
        booking.setTotalPrice(100.0); // 2 hours @ 50/hr
        booking.setStatus(BookingStatus.ACTIVE);
        booking.setActualCheckInAt(checkIn);
        booking.setClosingOtpCode("9999");
        booking.setClosingOtpAttempts(0);

        Payment payment = new Payment();
        payment.setId(300L);
        payment.setBooking(booking);
        payment.setAmount(100.0);
        payment.setCommission(10.0);
        payment.setOwnerEarnings(90.0);
        payment.setStatus("SUCCESS");

        when(bookingRepository.findById(3L)).thenReturn(Optional.of(booking));
        when(authService.getCurrentUser()).thenReturn(owner);
        when(paymentRepository.findByBookingId(3L)).thenReturn(Optional.of(payment));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OtpVerificationRequest request = new OtpVerificationRequest();
        request.setOtpCode("9999");

        BookingResponse response = bookingService.verifyClosingOtp(3L, request);

        assertEquals(BookingStatus.COMPLETED, response.getStatus());
        // 15 minutes elapsed is clamped to the 1-hour minimum (60 min @ 50/hr = 50.0)
        assertEquals(50.0, response.getActualUsageCharge(), 0.01);
        // 100.0 total - 50.0 actual = 50.0 pending refund adjustment
        assertEquals(50.0, response.getRefundAdjustment(), 0.01);

        // Verify Payment reconciliation: commission = 10% of 50.0 = 5.0, ownerEarnings = 45.0
        assertEquals(100.0, payment.getAmount(), 0.01, "Original payment amount must be preserved");
        assertEquals(50.0, payment.getSettledAmount(), 0.01, "Settled amount must reflect actual usage charge");
        assertEquals(50.0, payment.getRefundAdjustment(), 0.01, "Pending refund adjustment recorded on payment");
        assertEquals(5.0, payment.getCommission(), 0.01, "Commission adjusted to 10% of settled amount");
        assertEquals(45.0, payment.getOwnerEarnings(), 0.01, "Owner earnings adjusted to 90% of settled amount");
        verify(paymentRepository).save(payment);
    }

    @Test
    void testVerifyClosingOtp_Overstay_PreservesExtraChargeLogic() {
        LocalDateTime scheduledStart = LocalDateTime.now().minusMinutes(150);
        LocalDateTime scheduledEnd = LocalDateTime.now().minusMinutes(30);

        Booking booking = new Booking();
        booking.setId(4L);
        booking.setParkingSpace(space);
        booking.setDriver(driver);
        booking.setStartTime(scheduledStart);
        booking.setEndTime(scheduledEnd);
        booking.setTotalPrice(100.0); // 2 hours @ 50/hr
        booking.setStatus(BookingStatus.OVERSTAY);
        booking.setActualCheckInAt(scheduledStart);
        booking.setOverstayStartedAt(scheduledEnd); // Overstay for 30 minutes
        booking.setClosingOtpCode("4321");
        booking.setClosingOtpAttempts(0);

        Payment payment = new Payment();
        payment.setId(400L);
        payment.setBooking(booking);
        payment.setAmount(100.0);
        payment.setCommission(10.0);
        payment.setOwnerEarnings(90.0);
        payment.setStatus("SUCCESS");

        when(bookingRepository.findById(4L)).thenReturn(Optional.of(booking));
        when(authService.getCurrentUser()).thenReturn(owner);
        when(paymentRepository.findByBookingId(4L)).thenReturn(Optional.of(payment));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OtpVerificationRequest request = new OtpVerificationRequest();
        request.setOtpCode("4321");

        BookingResponse response = bookingService.verifyClosingOtp(4L, request);

        assertEquals(BookingStatus.COMPLETED, response.getStatus());
        assertEquals(100.0, response.getActualUsageCharge(), 0.01);
        assertEquals(0.0, response.getRefundAdjustment(), 0.01);
        // Overstay: 30 minutes @ 50/hr = 25.0 extra charge
        assertEquals(25.0, response.getOverstayExtraCharge(), 0.01);

        // Verify Payment records overstay amount and sets status to PENDING
        assertEquals(25.0, payment.getOverstayAmount(), 0.01);
        assertEquals("PENDING", payment.getOverstayPaymentStatus());
        assertEquals(100.0, payment.getSettledAmount(), 0.01);
        verify(paymentRepository).save(payment);
    }
}