package com.parkshare.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ConsoleNotificationServiceImpl implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(ConsoleNotificationServiceImpl.class);

    @Override
    public void sendNotification(String toEmail, String subject, String message) {
        logger.info("\n================= EMAIL NOTIFICATION =================\nTo: {}\nSubject: {}\nMessage: {}\n======================================================", toEmail, subject, message);
    }
}
