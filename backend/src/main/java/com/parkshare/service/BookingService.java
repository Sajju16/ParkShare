package com.parkshare.service;

import com.parkshare.dto.BookingRequest;
import com.parkshare.dto.BookingResponse;
import com.parkshare.entity.Booking;
import com.parkshare.entity.BookingStatus;
import com.parkshare.entity.ParkingSpace;
import com.parkshare.entity.User;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.ParkingSpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSpaceRepository parkingSpaceRepository;
    private final AuthService authService;

    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        if (request.getStartTime().isAfter(request.getEndTime()) || request.getStartTime().isEqual(request.getEndTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        User driver = authService.getCurrentUser();
        ParkingSpace space = parkingSpaceRepository.findById(request.getParkingSpaceId())
                .orElseThrow(() -> new RuntimeException("Parking space not found"));

        if (!space.isAvailable() || space.isDeleted()) {
            throw new RuntimeException("Parking space is not available for booking");
        }

        if (space.getOwner().getId().equals(driver.getId())) {
            throw new RuntimeException("Owners cannot book their own parking spaces");
        }

        // Validate overlap
        boolean hasOverlap = bookingRepository.existsOverlappingBooking(space.getId(), request.getStartTime(), request.getEndTime());
        if (hasOverlap) {
            throw new RuntimeException("The parking space is already booked during the selected time period.");
        }

        // Calculate price
        long hours = Duration.between(request.getStartTime(), request.getEndTime()).toHours();
        if (hours < 1) hours = 1; // Minimum 1 hour charge
        double totalPrice = hours * space.getPricePerHour();

        Booking booking = new Booking();
        booking.setDriver(driver);
        booking.setParkingSpace(space);
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setTotalPrice(totalPrice);
        booking.setStatus(BookingStatus.CONFIRMED); // Setting as confirmed for simplicity (mocking payment)
        
        booking = bookingRepository.save(booking);
        return mapToResponse(booking);
    }

    public List<BookingResponse> getDriverBookings() {
        User driver = authService.getCurrentUser();
        return bookingRepository.findByDriverIdOrderByStartTimeDesc(driver.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BookingResponse> getOwnerBookings() {
        User owner = authService.getCurrentUser();
        return bookingRepository.findByParkingSpaceOwnerIdOrderByStartTimeDesc(owner.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

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
        return mapToResponse(booking);
    }

    private BookingResponse mapToResponse(Booking booking) {
        BookingResponse response = new BookingResponse();
        response.setId(booking.getId());
        response.setParkingSpaceId(booking.getParkingSpace().getId());
        response.setParkingSpaceTitle(booking.getParkingSpace().getTitle());
        response.setParkingSpaceAddress(booking.getParkingSpace().getAddress() + ", " + booking.getParkingSpace().getCity());
        response.setDriverId(booking.getDriver().getId());
        response.setDriverName(booking.getDriver().getName());
        response.setStartTime(booking.getStartTime());
        response.setEndTime(booking.getEndTime());
        response.setTotalPrice(booking.getTotalPrice());
        response.setStatus(booking.getStatus());
        response.setCreatedAt(booking.getCreatedAt());
        return response;
    }
}
