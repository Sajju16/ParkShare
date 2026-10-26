package com.parkshare.service;

import com.parkshare.dto.PaymentOrderResponse;
import com.parkshare.dto.PaymentVerificationRequest;
import com.parkshare.entity.*;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private AuthService authService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private BookingService bookingService;

    @Mock
    private Environment environment;

    @InjectMocks
    private PaymentService paymentService;

    private User driver;
    private User otherDriver;
    private User owner;
    private ParkingSpace space;
    private Booking completedBooking;
    private Booking awaitingPaymentBooking;
    private Payment payment;
    private Payment reservationPayment;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "razorpayKeyId", "rzp_test_placeholder");
        ReflectionTestUtils.setField(paymentService, "razorpayKeySecret", "placeholder_secret");

        driver = new User();
        driver.setId(1L);
        driver.setName("Driver One");
        driver.setEmail("driver@example.com");
        driver.setRole(Role.DRIVER);

        otherDriver = new User();
        otherDriver.setId(2L);
        otherDriver.setName("Driver Two");
        otherDriver.setEmail("driver2@example.com");
        otherDriver.setRole(Role.DRIVER);

        owner = new User();
        owner.setId(10L);
        owner.setName("Owner One");
        owner.setEmail("owner@example.com");
        owner.setRole(Role.OWNER);

        space = new ParkingSpace();
        space.setId(100L);
        space.setTitle("Reserved Space");
        space.setOwner(owner);

        completedBooking = new Booking();
        completedBooking.setId(50L);
        completedBooking.setDriver(driver);
        completedBooking.setParkingSpace(space);
        completedBooking.setStatus(BookingStatus.COMPLETED);
        completedBooking.setTotalPrice(100.0);

        payment = new Payment();
        payment.setId(200L);
        payment.setBooking(completedBooking);
        payment.setAmount(100.0);
        payment.setOverstayAmount(40.0);
        payment.setOverstayPaymentStatus("PENDING");
        payment.setCommission(10.0);
        payment.setOwnerEarnings(90.0);

        awaitingPaymentBooking = new Booking();
        awaitingPaymentBooking.setId(60L);
        awaitingPaymentBooking.setDriver(driver);
        awaitingPaymentBooking.setParkingSpace(space);
        awaitingPaymentBooking.setStatus(BookingStatus.AWAITING_PAYMENT);
        awaitingPaymentBooking.setTotalPrice(150.0);

        reservationPayment = new Payment();
        reservationPayment.setId(201L);
        reservationPayment.setBooking(awaitingPaymentBooking);
        reservationPayment.setAmount(150.0);
        reservationPayment.setStatus("CREATED");
    }

    // ── Regular Booking Payments ─────────────────────────────────────────────

    @Test
    void testCreateRazorpayOrder_WhenLocalDevelopment_AllowsMockOrder() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{});
        when(authService.getCurrentUser()).thenReturn(driver);
        when(bookingRepository.findById(60L)).thenReturn(Optional.of(awaitingPaymentBooking));
        when(paymentRepository.findByBookingId(60L)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentOrderResponse response = paymentService.createRazorpayOrder(60L);

        assertNotNull(response);
        assertEquals("rzp_test_placeholder", response.getKeyId());
        assertTrue(response.getRazorpayOrderId().startsWith("order_mock_"));
        assertEquals(150.0, response.getAmount());
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void testCreateRazorpayOrder_WhenProductionProfile_RejectsMockOrder() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(authService.getCurrentUser()).thenReturn(driver);
        when(bookingRepository.findById(60L)).thenReturn(Optional.of(awaitingPaymentBooking));
        when(paymentRepository.findByBookingId(60L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.createRazorpayOrder(60L)
        );
        assertTrue(ex.getMessage().contains("Simulated payments are strictly disabled in production environment"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void testVerifyPayment_WhenLocalDevelopment_AllowsMockVerification() {
        reservationPayment.setRazorpayOrderId("order_mock_123");
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        when(paymentRepository.findByRazorpayOrderId("order_mock_123")).thenReturn(Optional.of(reservationPayment));
        when(authService.getCurrentUser()).thenReturn(driver);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_mock_123");
        req.setRazorpayPaymentId("pay_mock_123");
        req.setRazorpaySignature("mock_signature");

        paymentService.verifyPayment(req);

        assertEquals("SUCCESS", reservationPayment.getStatus());
        assertEquals("pay_mock_123", reservationPayment.getRazorpayPaymentId());
        assertEquals(BookingStatus.CONFIRMED, awaitingPaymentBooking.getStatus());
        verify(bookingService).generateOtp(60L);
        verify(notificationService).sendNotification(anyString(), anyString(), anyString());
    }

    @Test
    void testVerifyPayment_WhenProductionProfile_RejectsMockVerification() {
        reservationPayment.setRazorpayOrderId("order_mock_123");
        when(environment.getActiveProfiles()).thenReturn(new String[]{"production"});
        when(paymentRepository.findByRazorpayOrderId("order_mock_123")).thenReturn(Optional.of(reservationPayment));
        when(authService.getCurrentUser()).thenReturn(driver);

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_mock_123");
        req.setRazorpayPaymentId("pay_mock_123");
        req.setRazorpaySignature("mock_signature");

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.verifyPayment(req)
        );
        assertTrue(ex.getMessage().contains("Simulated payments are strictly disabled in production environment"));
        assertEquals("CREATED", reservationPayment.getStatus());
        verify(paymentRepository, never()).save(any());
        assertNotEquals(BookingStatus.CONFIRMED, awaitingPaymentBooking.getStatus());
        verify(bookingService, never()).generateOtp(anyLong());
    }

    // ── Overstay Payments ────────────────────────────────────────────────────

    @Test
    void testCreateOverstayRazorpayOrder_WhenLocalDevelopment_AllowsMockOrder() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{});
        when(authService.getCurrentUser()).thenReturn(driver);
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(completedBooking));
        when(paymentRepository.findByBookingId(50L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentOrderResponse response = paymentService.createOverstayRazorpayOrder(50L);

        assertNotNull(response);
        assertEquals("rzp_test_placeholder", response.getKeyId());
        assertTrue(response.getRazorpayOrderId().startsWith("order_mock_overstay_"));
        assertEquals(40.0, response.getAmount());
        assertEquals("CREATED", payment.getOverstayPaymentStatus());
        assertNotNull(payment.getOverstayRazorpayOrderId());
        verify(paymentRepository).save(payment);
    }

    @Test
    void testCreateOverstayRazorpayOrder_WhenProductionProfile_RejectsMockOrder() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(authService.getCurrentUser()).thenReturn(driver);
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(completedBooking));
        when(paymentRepository.findByBookingId(50L)).thenReturn(Optional.of(payment));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.createOverstayRazorpayOrder(50L)
        );
        assertTrue(ex.getMessage().contains("Simulated payments are strictly disabled in production environment"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void testVerifyOverstayPayment_WhenLocalDevelopment_AllowsMockVerification() {
        payment.setOverstayRazorpayOrderId("order_mock_overstay_123");
        when(environment.getActiveProfiles()).thenReturn(new String[]{});
        when(paymentRepository.findByOverstayRazorpayOrderId("order_mock_overstay_123")).thenReturn(Optional.of(payment));
        when(authService.getCurrentUser()).thenReturn(driver);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_mock_overstay_123");
        req.setRazorpayPaymentId("pay_mock_overstay_456");
        req.setRazorpaySignature("mock_signature");

        paymentService.verifyOverstayPayment(req);

        assertEquals("SUCCESS", payment.getOverstayPaymentStatus());
        assertEquals("pay_mock_overstay_456", payment.getOverstayRazorpayPaymentId());
        // 40.0 * 10% commission = 4.0 extra; 10.0 + 4.0 = 14.0
        assertEquals(14.0, payment.getCommission());
        // 40.0 * 90% owner earnings = 36.0 extra; 90.0 + 36.0 = 126.0
        assertEquals(126.0, payment.getOwnerEarnings());
        verify(paymentRepository).save(payment);
        verify(notificationService, times(2)).sendNotification(anyString(), anyString(), anyString());
    }

    @Test
    void testVerifyOverstayPayment_WhenProductionProfile_RejectsMockVerification() {
        payment.setOverstayRazorpayOrderId("order_mock_overstay_123");
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(paymentRepository.findByOverstayRazorpayOrderId("order_mock_overstay_123")).thenReturn(Optional.of(payment));
        when(authService.getCurrentUser()).thenReturn(driver);

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_mock_overstay_123");
        req.setRazorpayPaymentId("pay_mock_overstay_456");
        req.setRazorpaySignature("mock_signature");

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.verifyOverstayPayment(req)
        );
        assertTrue(ex.getMessage().contains("Simulated payments are strictly disabled in production environment"));
        assertEquals("PENDING", payment.getOverstayPaymentStatus());
        verify(paymentRepository, never()).save(any());
        verify(notificationService, never()).sendNotification(anyString(), anyString(), anyString());
    }

    // ── Edge Cases & Security Validations ────────────────────────────────────

    @Test
    void testCreateOverstayRazorpayOrder_WhenBookingNotCompleted_ThrowsException() {
        completedBooking.setStatus(BookingStatus.ACTIVE);
        when(authService.getCurrentUser()).thenReturn(driver);
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(completedBooking));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.createOverstayRazorpayOrder(50L)
        );
        assertTrue(ex.getMessage().contains("Overstay payment is only allowed for COMPLETED bookings"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void testCreateOverstayRazorpayOrder_WhenUnauthorizedDriver_ThrowsException() {
        when(authService.getCurrentUser()).thenReturn(otherDriver);
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(completedBooking));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.createOverstayRazorpayOrder(50L)
        );
        assertTrue(ex.getMessage().contains("Unauthorized"));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void testCreateOverstayRazorpayOrder_WhenAlreadyPaid_ThrowsException() {
        payment.setOverstayPaymentStatus("SUCCESS");
        when(authService.getCurrentUser()).thenReturn(driver);
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(completedBooking));
        when(paymentRepository.findByBookingId(50L)).thenReturn(Optional.of(payment));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.createOverstayRazorpayOrder(50L)
        );
        assertTrue(ex.getMessage().contains("Overstay payment already completed"));
    }

    @Test
    void testVerifyOverstayPayment_WhenAlreadySuccess_IsIdempotent() {
        payment.setOverstayRazorpayOrderId("order_mock_overstay_123");
        payment.setOverstayPaymentStatus("SUCCESS");
        when(paymentRepository.findByOverstayRazorpayOrderId("order_mock_overstay_123")).thenReturn(Optional.of(payment));
        when(authService.getCurrentUser()).thenReturn(driver);

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_mock_overstay_123");
        req.setRazorpayPaymentId("pay_mock_overstay_456");
        req.setRazorpaySignature("mock_signature");

        paymentService.verifyOverstayPayment(req);

        verify(paymentRepository, never()).save(any());
        verify(notificationService, never()).sendNotification(anyString(), anyString(), anyString());
    }

    @Test
    void testVerifyOverstayPayment_WhenUnauthorized_ThrowsException() {
        payment.setOverstayRazorpayOrderId("order_mock_overstay_123");
        when(paymentRepository.findByOverstayRazorpayOrderId("order_mock_overstay_123")).thenReturn(Optional.of(payment));
        when(authService.getCurrentUser()).thenReturn(otherDriver);

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_mock_overstay_123");
        req.setRazorpayPaymentId("pay_mock_overstay_456");
        req.setRazorpaySignature("mock_signature");

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentService.verifyOverstayPayment(req)
        );
        assertTrue(ex.getMessage().contains("Unauthorized"));
        verify(paymentRepository, never()).save(any());
    }
}
