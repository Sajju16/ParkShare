package com.parkshare.entity;

/**
 * ParkShare booking lifecycle.
 *
 * PENDING          – Driver requested, awaiting owner response.
 * AWAITING_PAYMENT – Owner accepted; driver must pay within 10 minutes.
 * CONFIRMED        – Payment complete; opening OTP generated. Driver must present OTP on arrival.
 * ACTIVE           – Driver has entered the space (opening OTP verified by owner).
 * OVERSTAY         – Scheduled endTime has passed but closing OTP has NOT been verified.
 *                    The space is still physically occupied. Extra charges accumulate.
 * COMPLETED        – Driver confirmed departure via closing OTP. Space is released.
 * REJECTED         – Owner manually rejected the request.
 * AUTO_REJECTED    – Owner did not respond within 5 minutes (scheduler).
 * PAYMENT_EXPIRED  – Driver did not complete payment within 10 minutes (scheduler).
 * CANCELLED        – Cancelled by driver or owner before the session started.
 * NO_SHOW          – Driver never arrived after booking was CONFIRMED (scheduler – future slice).
 */
public enum BookingStatus {
    PENDING,
    AWAITING_PAYMENT,
    CONFIRMED,
    ACTIVE,
    OVERSTAY,
    COMPLETED,
    REJECTED,
    AUTO_REJECTED,
    PAYMENT_EXPIRED,
    CANCELLED,
    NO_SHOW
}
