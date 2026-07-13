package com.example.aiseatbooking.seat;

import com.example.aiseatbooking.common.SeatNotAvailableException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeatHoldService {

    private final SeatRepository seatRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String REDIS_SEAT_HOLD_PREFIX = "hold:seat:";
    private static final String REDIS_ID_HOLD_PREFIX = "hold:id:";

    @Transactional
    public HoldResponse holdSeats(String userId, Long eventId, List<Long> seatIds, long ttlSeconds) {
        log.info("Attempting to hold seats {} for user {} on event {}", seatIds, userId, eventId);

        // 1. Acquire DB lock on the seats in order to prevent deadlock by sorting IDs
        List<Long> sortedSeatIds = new ArrayList<>(seatIds);
        sortedSeatIds.sort(Long::compareTo);

        List<Seat> seats = seatRepository.findAllByIdInForUpdate(sortedSeatIds);

        if (seats.size() != seatIds.size()) {
            throw new IllegalArgumentException("One or more seat IDs are invalid");
        }

        // 2. Validate availability
        for (Seat seat : seats) {
            if (!seat.getEvent().getId().equals(eventId)) {
                throw new IllegalArgumentException("Seat " + seat.getId() + " does not belong to event " + eventId);
            }

            if (seat.getStatus() == SeatStatus.BOOKED) {
                throw new SeatNotAvailableException("Seat " + seat.getSeatLabel() + " is already booked");
            }

            if (seat.getStatus() == SeatStatus.HELD) {
                // If it is held in DB, check if the hold is still active in Redis
                String currentHoldOwner = redisTemplate.opsForValue().get(REDIS_SEAT_HOLD_PREFIX + seat.getId());
                if (currentHoldOwner != null) {
                    throw new SeatNotAvailableException("Seat " + seat.getSeatLabel() + " is currently held by another user");
                } else {
                    log.info("Seat {} was marked HELD in DB but Redis hold has expired. Overwriting hold.", seat.getId());
                }
            }
        }

        // 3. Generate UUID holdId
        String holdId = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + (ttlSeconds * 1000);

        HoldData holdData = HoldData.builder()
                .holdId(holdId)
                .userId(userId)
                .eventId(eventId)
                .seatIds(seatIds)
                .expiresAt(expiresAt)
                .build();

        String holdDataJson;
        try {
            holdDataJson = objectMapper.writeValueAsString(holdData);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize HoldData", e);
            throw new RuntimeException("Error placing hold: serialization failed", e);
        }

        // 4. Place holds in Redis
        // Save the hold grouping mapping hold:id:{holdId}
        redisTemplate.opsForValue().set(
                REDIS_ID_HOLD_PREFIX + holdId,
                holdDataJson,
                ttlSeconds,
                TimeUnit.SECONDS
        );

        for (Seat seat : seats) {
            // Save the individual seat reservation mapping hold:seat:{seatId}
            redisTemplate.opsForValue().set(
                    REDIS_SEAT_HOLD_PREFIX + seat.getId(),
                    userId,
                    ttlSeconds,
                    TimeUnit.SECONDS
            );

            // Update database
            seat.setStatus(SeatStatus.HELD);
        }

        seatRepository.saveAll(seats);
        log.info("Successfully held seats {} with hold ID {} for user {}", seatIds, holdId, userId);

        // TODO: Broadcast seat state change to real-time clients

        return HoldResponse.builder()
                .holdId(holdId)
                .eventId(eventId)
                .seatIds(seatIds)
                .expiresAt(expiresAt)
                .build();
    }

    @Transactional
    public void releaseHold(String holdId) {
        log.info("Releasing hold {}", holdId);
        HoldData holdData = getHoldData(holdId);
        if (holdData == null) {
            log.warn("Hold {} not found or already expired in Redis. Attempting to delete keys and clean up.", holdId);
            redisTemplate.delete(REDIS_ID_HOLD_PREFIX + holdId);
            return;
        }

        List<Long> sortedSeatIds = new ArrayList<>(holdData.getSeatIds());
        sortedSeatIds.sort(Long::compareTo);

        List<Seat> seats = seatRepository.findAllByIdInForUpdate(sortedSeatIds);

        for (Seat seat : seats) {
            redisTemplate.delete(REDIS_SEAT_HOLD_PREFIX + seat.getId());
            if (seat.getStatus() == SeatStatus.HELD) {
                seat.setStatus(SeatStatus.AVAILABLE);
            }
        }
        seatRepository.saveAll(seats);
        redisTemplate.delete(REDIS_ID_HOLD_PREFIX + holdId);
        log.info("Successfully released hold {}", holdId);
        // TODO: Broadcast release
    }

    public HoldData getHoldData(String holdId) {
        String json = redisTemplate.opsForValue().get(REDIS_ID_HOLD_PREFIX + holdId);
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, HoldData.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize HoldData for hold ID {}", holdId, e);
            return null;
        }
    }

    public String getSeatHoldOwner(Long seatId) {
        return redisTemplate.opsForValue().get(REDIS_SEAT_HOLD_PREFIX + seatId);
    }
}
