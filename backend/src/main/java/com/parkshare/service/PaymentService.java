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
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            JSONObject orderRequest = new JSONObject();
            // Razorpay amount is in paise (multiply by 100)
            int amountInPaise = (int) (booking.getTotalPrice() * 100);
            orderRequest.put("amount", amountInPaise); 
            orderRequest.put("currency", "USD");
            orderRequest.put("receipt", "txn_" + booking.getId());

            Order order = razorpay.orders.create(orderRequest);
            String orderId = order.get("id");

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
                    .currency("USD")
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
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());

            boolean isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);

            if (isValid) {
                payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
                payment.setStatus("SUCCESS");
                paymentRepository.save(payment);

                Booking booking = payment.getBooking();
                booking.setStatus(BookingStatus.CONFIRMED);
                bookingRepository.save(booking);

                notificationService.sendNotification(
                    booking.getDriver().getEmail(),
                    "Payment Successful & Booking Confirmed",
                    "Your payment of $" + booking.getTotalPrice() + " was successful. Your booking for " + booking.getParkingSpace().getTitle() + " is now CONFIRMED."
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
            document.add(new Paragraph("Total Amount Paid: $" + String.format("%.2f", payment.getAmount()), boldFont));
            document.add(new Paragraph("Status: " + payment.getStatus(), normalFont));
            
            document.add(new Paragraph("\n\nThank you for using ParkShare!", normalFont));
            
            document.close();
            return baos.toByteArray();
        } catch (DocumentException | java.io.IOException e) {
            throw new RuntimeException("Error generating receipt PDF");
        }
    }
}
