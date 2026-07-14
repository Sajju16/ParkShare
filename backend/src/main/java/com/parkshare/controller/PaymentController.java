package com.parkshare.controller;

import com.parkshare.dto.ApiResponse;
import com.parkshare.dto.PaymentOrderResponse;
import com.parkshare.dto.PaymentVerificationRequest;
import com.parkshare.entity.Payment;
import com.parkshare.repository.PaymentRepository;
import com.parkshare.service.AuthService;
import com.parkshare.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final AuthService authService;

    @PostMapping("/create-order/{bookingId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<PaymentOrderResponse>> createOrder(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.success("Order created", paymentService.createRazorpayOrder(bookingId)));
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<String>> verifyPayment(@Valid @RequestBody PaymentVerificationRequest request) {
        paymentService.verifyPayment(request);
        return ResponseEntity.ok(ApiResponse.success("Payment verified successfully", "SUCCESS"));
    }

    @GetMapping("/receipt/booking/{bookingId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<byte[]> downloadReceiptByBooking(@PathVariable Long bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new RuntimeException("Payment not found for this booking"));
        byte[] pdfBytes = paymentService.generateReceipt(payment.getId());
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "receipt_booking_" + bookingId + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
    
    @GetMapping("/owner/completed")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<Payment>>> getOwnerCompletedPayments() {
        Long ownerId = authService.getCurrentUser().getId();
        List<Payment> payments = paymentRepository.findByBookingParkingSpaceOwnerIdAndStatusOrderByCreatedAtDesc(ownerId, "SUCCESS");
        return ResponseEntity.ok(ApiResponse.success("Fetched completed payments", payments));
    }
}
