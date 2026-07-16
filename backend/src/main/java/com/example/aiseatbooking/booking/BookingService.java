package com.example.aiseatbooking.booking;

import com.example.aiseatbooking.common.HoldExpiredException;
import com.example.aiseatbooking.common.PaymentFailedException;
import com.example.aiseatbooking.seat.HoldData;
import com.example.aiseatbooking.seat.SeatHoldService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final SeatHoldService seatHoldService;
    private final BookingTransactionService bookingTransactionService;
    private final BookingRepository bookingRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String REDIS_IDEMPOTENCY_PREFIX = "idempotency:booking:";

    public Booking confirmBooking(String holdId, String idempotencyKey, double ticketPrice) {
        log.info("Request to confirm booking for hold {}. Idempotency key: {}", holdId, idempotencyKey);

        // 1. Handle Idempotency
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String cachedBookingJson = redisTemplate.opsForValue().get(REDIS_IDEMPOTENCY_PREFIX + idempotencyKey);
            if (cachedBookingJson != null) {
                log.info("Idempotent booking hit. Returning cached response for key {}", idempotencyKey);
                try {
                    return objectMapper.readValue(cachedBookingJson, Booking.class);
                } catch (JsonProcessingException e) {
                    log.error("Failed to deserialize cached Booking", e);
                }
            }
        }

        // 2. Validate hold
        HoldData holdData = seatHoldService.getHoldData(holdId);
        if (holdData == null) {
            throw new HoldExpiredException("Hold has expired or does not exist. Please hold seats again.");
        }

        double totalAmount = ticketPrice * holdData.getSeatIds().size();

        // 3. Process database transaction & payment
        Booking booking;
        try {
            booking = bookingTransactionService.processBookingTransaction(holdData, totalAmount);
        } catch (PaymentFailedException e) {
            log.warn("Payment failed during booking. Hold {} remains active until TTL expiry.", holdId);
            throw e;
        }

        // 4. Cache response for Idempotency
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            try {
                String bookingJson = objectMapper.writeValueAsString(booking);
                redisTemplate.opsForValue().set(
                        REDIS_IDEMPOTENCY_PREFIX + idempotencyKey,
                        bookingJson,
                        1,
                        TimeUnit.HOURS
                );
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize Booking for caching", e);
            }
        }

        return booking;
    }

    public Optional<Booking> getBookingById(Long id) {
        return bookingRepository.findById(id);
    }
}
