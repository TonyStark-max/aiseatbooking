package com.example.aiseatbooking.payment;

import com.example.aiseatbooking.common.PaymentFailedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
@Slf4j
public class MockPaymentService {

    private final Random random = new Random();
    
    // Default config: 10% failure rate
    private double failureRate = 0.10;

    public void processPayment(String userId, double amount) {
        log.info("Processing payment for user {} of amount ${}", userId, amount);
        
        // 1. Simulate network latency (200ms to 1200ms)
        int latency = 200 + random.nextInt(1000);
        try {
            Thread.sleep(latency);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Payment processing interrupted", e);
        }

        // 2. Simulate failure rate
        if (random.nextDouble() < failureRate) {
            log.warn("Payment failed for user {} of amount ${}", userId, amount);
            throw new PaymentFailedException("Payment declined by bank");
        }

        log.info("Payment successful for user {} of amount ${}", userId, amount);
    }

    public void setFailureRate(double failureRate) {
        this.failureRate = failureRate;
    }
}
