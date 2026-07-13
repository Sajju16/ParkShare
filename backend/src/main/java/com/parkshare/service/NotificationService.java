package com.parkshare.service;

public interface NotificationService {
    void sendNotification(String toEmail, String subject, String message);
}
