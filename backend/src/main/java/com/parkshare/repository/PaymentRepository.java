package com.parkshare.repository;

import com.parkshare.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByBookingId(Long bookingId);
    List<Payment> findByBookingDriverIdOrderByCreatedAtDesc(Long driverId);
    List<Payment> findByBookingParkingSpaceOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, String status);
}
