package com.parkshare.controller;

import com.parkshare.dto.ApiResponse;
import com.parkshare.dto.BookingRequest;
import com.parkshare.dto.BookingResponse;
import com.parkshare.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Booking created successfully", bookingService.createBooking(request)));
    }

    @GetMapping("/driver")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getDriverBookings() {
        return ResponseEntity.ok(ApiResponse.success("Fetched driver bookings", bookingService.getDriverBookings()));
    }

    @GetMapping("/owner")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getOwnerBookings() {
        return ResponseEntity.ok(ApiResponse.success("Fetched owner space bookings", bookingService.getOwnerBookings()));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('DRIVER', 'OWNER')")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled successfully", bookingService.cancelBooking(id)));
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<BookingResponse>> acceptBooking(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Booking accepted", bookingService.acceptBooking(id)));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<BookingResponse>> rejectBooking(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Booking rejected", bookingService.rejectBooking(id)));
    }

    @GetMapping("/owner/stats")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<com.parkshare.dto.OwnerStatsResponse>> getOwnerStats() {
        return ResponseEntity.ok(ApiResponse.success("Owner stats fetched", bookingService.getOwnerStats()));
    }
}
