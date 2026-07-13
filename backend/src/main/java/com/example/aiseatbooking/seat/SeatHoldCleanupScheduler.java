package com.example.aiseatbooking.seat;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeatHoldCleanupScheduler {

    private final SeatRepository seatRepository;
    private final StringRedisTemplate redisTemplate;

    private static final String REDIS_HOLD_PREFIX = "hold:seat:";

    @Scheduled(fixedRate = 10000)
    @Transactional
    public void cleanupExpiredHolds() {
        log.trace("Running background cleanup scheduler for expired holds...");
        List<Seat> heldSeats = seatRepository.findAll().stream()
                .filter(seat -> seat.getStatus() == SeatStatus.HELD)
                .collect(Collectors.toList());

        if (heldSeats.isEmpty()) {
            return;
        }

        boolean updated = false;

        for (Seat seat : heldSeats) {
            String key = REDIS_HOLD_PREFIX + seat.getId();
            Boolean hasKey = redisTemplate.hasKey(key);

            if (Boolean.FALSE.equals(hasKey)) {
                log.info("Hold for seat {} (label: {}) has expired in Redis. Resetting status to AVAILABLE.", seat.getId(), seat.getSeatLabel());
                seat.setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(seat);
                updated = true;
            }
        }

        if (updated) {
            log.info("Expired holds cleaned up successfully.");
            // TODO: Broadcast state change
        }
    }
}
