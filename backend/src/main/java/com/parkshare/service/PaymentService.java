package com.parkshare.service;

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Font;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;
import com.parkshare.dto.PaymentOrderResponse;
import com.parkshare.dto.PaymentVerificationRequest;
import com.parkshare.entity.Booking;
import com.parkshare.entity.BookingStatus;
import com.parkshare.entity.Payment;
import com.parkshare.entity.User;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final BookingService bookingService;

    @Value("${razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    private static final double COMMISSION_RATE = 0.10; // 10% platform fee

    @Transactional
    public PaymentOrderResponse createRazorpayOrder(Long bookingId) {
        User driver = authService.getCurrentUser();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        if (booking.getStatus() != BookingStatus.AWAITING_PAYMENT) {
            throw new RuntimeException("Booking is not awaiting payment");
        }
        
        // Ensure no existing successful payment exists to prevent duplicate payment
        Optional<Payment> existingPayment = paymentRepository.findByBookingId(bookingId);
        if (existingPayment.isPresent() && "SUCCESS".equals(existingPayment.get().getStatus())) {
            throw new RuntimeException("Payment already completed for this booking");
        }

        try {
            String orderId;
            if ("rzp_test_placeholder".equals(razorpayKeyId)) {
                orderId = "order_mock_" + System.currentTimeMillis();
            } else {
                RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

                JSONObject orderRequest = new JSONObject();
                // Razorpay amount is in paise (multiply by 100)
                int amountInPaise = (int) (booking.getTotalPrice() * 100);
                orderRequest.put("amount", amountInPaise); 
                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", "txn_" + booking.getId());

                Order order = razorpay.orders.create(orderRequest);
                orderId = order.get("id");
            }

            Payment payment = existingPayment.orElse(new Payment());
            payment.setBooking(booking);
            payment.setRazorpayOrderId(orderId);
            payment.setAmount(booking.getTotalPrice());
            payment.setCommission(booking.getTotalPrice() * COMMISSION_RATE);
            payment.setOwnerEarnings(booking.getTotalPrice() * (1 - COMMISSION_RATE));
            payment.setStatus("CREATED");
            
            payment = paymentRepository.save(payment);

            return PaymentOrderResponse.builder()
                    .razorpayOrderId(orderId)
                    .amount(booking.getTotalPrice())
                    .currency("INR")
                    .keyId(razorpayKeyId)
                    .paymentId(payment.getId())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage());
        }
    }

    @Transactional
    public void verifyPayment(PaymentVerificationRequest request) {
        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new RuntimeException("Payment order not found"));

        try {
            boolean isValid;
            if ("rzp_test_placeholder".equals(razorpayKeyId)) {
                isValid = true;
            } else {
                JSONObject options = new JSONObject();
                options.put("razorpay_order_id", request.getRazorpayOrderId());
                options.put("razorpay_payment_id", request.getRazorpayPaymentId());
                options.put("razorpay_signature", request.getRazorpaySignature());

                isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);
            }

            if (isValid) {
                payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
                payment.setStatus("SUCCESS");
                paymentRepository.save(payment);

                Booking booking = payment.getBooking();
                booking.setStatus(BookingStatus.CONFIRMED);
                bookingRepository.save(booking);

                // PRD v1.0 Slice 2: generate the 4-digit OTP immediately after
                // payment is confirmed, so the driver can see it straight away.
                bookingService.generateOtp(booking.getId());

                notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Payment Successful & Booking Confirmed",
                    "Your payment of ₹" + booking.getTotalPrice() + " was successful. Your booking for " + booking.getParkingSpace().getTitle() + " is now CONFIRMED."
                );
            } else {
                payment.setStatus("FAILED");
                paymentRepository.save(payment);
                throw new RuntimeException("Payment signature verification failed");
            }
        } catch (Exception e) {
            throw new RuntimeException("Payment verification error: " + e.getMessage());
        }
    }

    // ── PRD v1.1 – Overstay Payment Settlement ───────────────────────────────

    @Transactional
    public PaymentOrderResponse createOverstayRazorpayOrder(Long bookingId) {
        User driver = authService.getCurrentUser();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this booking");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new RuntimeException("Overstay payment is only allowed for COMPLETED bookings");
        }

        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new RuntimeException("Original payment record not found for this booking"));

        Double overstayAmt = payment.getOverstayAmount();
        if (overstayAmt == null || overstayAmt <= 0) {
            throw new RuntimeException("No overstay charge owed for this booking");
        }

        if ("SUCCESS".equals(payment.getOverstayPaymentStatus()) || "PAID".equals(payment.getOverstayPaymentStatus())) {
            throw new RuntimeException("Overstay payment already completed for this booking");
        }

        try {
            String orderId;
            if ("rzp_test_placeholder".equals(razorpayKeyId)) {
                orderId = "order_mock_overstay_" + System.currentTimeMillis();
            } else {
                RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

                JSONObject orderRequest = new JSONObject();
                int amountInPaise = (int) (overstayAmt * 100);
                orderRequest.put("amount", amountInPaise);
                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", "overstay_txn_" + booking.getId());

                Order order = razorpay.orders.create(orderRequest);
                orderId = order.get("id");
            }

            payment.setOverstayRazorpayOrderId(orderId);
            payment.setOverstayPaymentStatus("CREATED");
            payment = paymentRepository.save(payment);

            return PaymentOrderResponse.builder()
                    .razorpayOrderId(orderId)
                    .amount(overstayAmt)
                    .currency("INR")
                    .keyId(razorpayKeyId)
                    .paymentId(payment.getId())
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create overstay Razorpay order: " + e.getMessage());
        }
    }

    @Transactional
    public void verifyOverstayPayment(PaymentVerificationRequest request) {
        Payment payment = paymentRepository.findByOverstayRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new RuntimeException("Overstay payment order not found"));

        User driver = authService.getCurrentUser();
        if (!payment.getBooking().getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        if ("SUCCESS".equals(payment.getOverstayPaymentStatus())) {
            return; // Idempotent success
        }

        try {
            boolean isValid;
            if ("rzp_test_placeholder".equals(razorpayKeyId)) {
                isValid = true;
            } else {
                JSONObject options = new JSONObject();
                options.put("razorpay_order_id", request.getRazorpayOrderId());
                options.put("razorpay_payment_id", request.getRazorpayPaymentId());
                options.put("razorpay_signature", request.getRazorpaySignature());

                isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);
            }

            if (isValid) {
                payment.setOverstayRazorpayPaymentId(request.getRazorpayPaymentId());
                payment.setOverstayPaymentStatus("SUCCESS");

                double overstayAmt = payment.getOverstayAmount() != null ? payment.getOverstayAmount() : 0.0;
                double extraCommission = overstayAmt * COMMISSION_RATE;
                double extraOwnerEarnings = overstayAmt * (1 - COMMISSION_RATE);
                payment.setCommission(payment.getCommission() + extraCommission);
                payment.setOwnerEarnings(payment.getOwnerEarnings() + extraOwnerEarnings);

                paymentRepository.save(payment);

                notificationService.sendNotification(
                        payment.getBooking().getDriver().getEmail(),
                        "Overstay Payment Successful",
                        "Your payment of ₹" + String.format("%.2f", overstayAmt) + " for overstay at " + payment.getBooking().getParkingSpace().getTitle() + " was successful. Thank you!"
                );

                notificationService.sendNotification(
                        payment.getBooking().getParkingSpace().getOwner().getEmail(),
                        "Overstay Payment Received",
                        "Driver has paid ₹" + String.format("%.2f", overstayAmt) + " for overstay at " + payment.getBooking().getParkingSpace().getTitle() + "."
                );
            } else {
                payment.setOverstayPaymentStatus("FAILED");
                paymentRepository.save(payment);
                throw new RuntimeException("Overstay payment signature verification failed");
            }
        } catch (Exception e) {
            throw new RuntimeException("Overstay payment verification error: " + e.getMessage());
        }
    }

    public byte[] generateReceipt(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        User currentUser = authService.getCurrentUser();
        if (!payment.getBooking().getDriver().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized to download this receipt");
        }

        if (!"SUCCESS".equals(payment.getStatus())) {
            throw new RuntimeException("Cannot generate receipt for uncompleted payment");
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = new Font(Font.FontFamily.HELVETICA, 18, Font.BOLD);
            Font normalFont = new Font(Font.FontFamily.HELVETICA, 12, Font.NORMAL);
            Font boldFont = new Font(Font.FontFamily.HELVETICA, 12, Font.BOLD);

            document.add(new Paragraph("ParkShare - Payment Receipt", titleFont));
            document.add(new Paragraph("\n"));

            document.add(new Paragraph("Receipt Number: " + payment.getRazorpayPaymentId(), normalFont));
            document.add(new Paragraph("Date: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), normalFont));
            document.add(new Paragraph("\n"));

            document.add(new Paragraph("Driver Details:", boldFont));
            document.add(new Paragraph("Name: " + payment.getBooking().getDriver().getName(), normalFont));
            document.add(new Paragraph("Email: " + payment.getBooking().getDriver().getEmail(), normalFont));
            document.add(new Paragraph("\n"));

            document.add(new Paragraph("Booking Details:", boldFont));
            document.add(new Paragraph("Parking Space: " + payment.getBooking().getParkingSpace().getTitle(), normalFont));
            document.add(new Paragraph("Address: " + payment.getBooking().getParkingSpace().getAddress(), normalFont));
            document.add(new Paragraph("Start Time: " + payment.getBooking().getStartTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")), normalFont));
            document.add(new Paragraph("End Time: " + payment.getBooking().getEndTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")), normalFont));
            document.add(new Paragraph("\n"));

            document.add(new Paragraph("Payment Summary:", boldFont));
            document.add(new Paragraph("Original Booking Paid: ₹" + String.format("%.2f", payment.getAmount()), normalFont));

            // Actual usage billing breakdown (v1.3)
            Booking bk = payment.getBooking();
            if (bk.getActualUsageCharge() != null) {
                document.add(new Paragraph("Actual Usage Charge: ₹" + String.format("%.2f", bk.getActualUsageCharge()), normalFont));
                if (bk.getRefundAdjustment() != null && bk.getRefundAdjustment() > 0) {
                    document.add(new Paragraph("Refund/Adjustment: ₹" + String.format("%.2f", bk.getRefundAdjustment()) + " (Pending — will be processed separately)", normalFont));
                }
            }

            if (payment.getOverstayAmount() != null && payment.getOverstayAmount() > 0) {
                document.add(new Paragraph("Overstay Charge: ₹" + String.format("%.2f", payment.getOverstayAmount()), normalFont));
                document.add(new Paragraph("Overstay Payment Status: " + payment.getOverstayPaymentStatus(), normalFont));
                double totalPaid = payment.getAmount() + ("SUCCESS".equals(payment.getOverstayPaymentStatus()) ? payment.getOverstayAmount() : 0.0);
                document.add(new Paragraph("Total Amount Paid: ₹" + String.format("%.2f", totalPaid), boldFont));
            } else {
                document.add(new Paragraph("Total Amount Paid: ₹" + String.format("%.2f", payment.getAmount()), boldFont));
            }
            document.add(new Paragraph("Status: " + payment.getStatus(), normalFont));

            document.add(new Paragraph("\n\nThank you for using ParkShare!", normalFont));

            document.close();
            return baos.toByteArray();
        } catch (DocumentException | java.io.IOException e) {
            throw new RuntimeException("Error generating receipt PDF");
        }
    }

    /**
     * Maps a Payment JPA entity to a safe, serializable DTO.
     * Avoids LazyInitializationException when serializing to JSON.
     */
    public com.parkshare.dto.PaymentSummaryResponse mapToSummary(Payment payment) {
        String spaceTitle = null;
        try {
            spaceTitle = payment.getBooking().getParkingSpace().getTitle();
        } catch (Exception ignored) { }

        return com.parkshare.dto.PaymentSummaryResponse.builder()
                .id(payment.getId())
                .bookingId(payment.getBooking().getId())
                .parkingSpaceTitle(spaceTitle)
                .razorpayPaymentId(payment.getRazorpayPaymentId())
                .amount(payment.getAmount())
                .commission(payment.getCommission())
                .ownerEarnings(payment.getOwnerEarnings())
                .status(payment.getStatus())
                .createdAt(payment.getCreatedAt())
                .overstayAmount(payment.getOverstayAmount())
                .overstayPaymentStatus(payment.getOverstayPaymentStatus())
                .build();
    }
}
