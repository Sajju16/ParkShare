package com.parkshare.entity;

/**
 * PRD v1.0 booking lifecycle.
 *
 * PENDING          – Driver requested, awaiting owner response.
 * AWAITING_PAYMENT – Owner accepted; driver must pay within 10 minutes.
 * CONFIRMED        – Payment complete; OTP generated (future slice).
 * ACTIVE           – Driver has entered the space (OTP verified – future slice).
 * COMPLETED        – Booking end-time reached; session closed automatically (scheduler – future slice).
 * REJECTED         – Owner manually rejected the request.
 * AUTO_REJECTED    – Owner did not respond within 5 minutes (scheduler – future slice).
 * PAYMENT_EXPIRED  – Driver did not complete payment within 10 minutes (scheduler – future slice).
 * CANCELLED        – Cancelled by driver or owner before the session started.
 * NO_SHOW          – Driver never arrived after booking was CONFIRMED (scheduler – future slice).
 */
public enum BookingStatus {
    PENDING,
    AWAITING_PAYMENT,
    CONFIRMED,
    ACTIVE,
    COMPLETED,
    REJECTED,
    AUTO_REJECTED,
    PAYMENT_EXPIRED,
    CANCELLED,
    NO_SHOW
}
