package com.parkshare.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables Spring's @Scheduled task execution.
 *
 * By default Spring uses a single-threaded scheduler thread pool.
 * We configure a pool size of 2 so the three scheduler tasks (auto-reject,
 * payment-expiry, completion) can run concurrently without blocking each other
 * if one task takes slightly longer than usual.
 *
 * Pool size is intentionally small — these are lightweight DB operations that
 * run every 60 seconds and should never need more than 2 threads.
 */
@Configuration
@EnableScheduling
public class SchedulerConfig {
    // No beans required — @EnableScheduling does all the work.
    // Thread pool size is configured in application.yml under
    // spring.task.scheduling.pool.size
}
