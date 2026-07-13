package com.example.aiseatbooking;

import com.example.aiseatbooking.common.SeatNotAvailableException;
import com.example.aiseatbooking.event.Event;
import com.example.aiseatbooking.event.EventRepository;
import com.example.aiseatbooking.seat.Seat;
import com.example.aiseatbooking.seat.SeatHoldService;
import com.example.aiseatbooking.seat.SeatRepository;
import com.example.aiseatbooking.seat.SeatStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class SeatBookingConcurrencyTests {

    @Autowired
    private SeatHoldService seatHoldService;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private EventRepository eventRepository;

    private Long eventId;
    private Long seatId;

    @BeforeEach
    public void setup() {
        seatRepository.deleteAll();
        eventRepository.deleteAll();

        Event event = Event.builder()
                .name("Concurrency Test Event")
                .venue("Test Venue")
                .datetime(LocalDateTime.now().plusDays(1))
                .totalSeats(1)
                .build();
        event = eventRepository.save(event);
        eventId = event.getId();

        Seat seat = Seat.builder()
                .event(event)
                .seatLabel("A1")
                .status(SeatStatus.AVAILABLE)
                .build();
        seat = seatRepository.save(seat);
        seatId = seat.getId();
    }

    @Test
    public void testConcurrentHoldsOnSameSeat() throws InterruptedException {
        int threadCount = 8;
        ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<String> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final String userId = "user-" + i;
            executorService.submit(() -> {
                try {
                    startLatch.await();
                    seatHoldService.holdSeats(userId, eventId, List.of(seatId), 10);
                    successCount.incrementAndGet();
                } catch (SeatNotAvailableException e) {
                    failureCount.incrementAndGet();
                } catch (Exception e) {
                    errors.add(e.getClass().getSimpleName() + ": " + e.getMessage());
                    failureCount.incrementAndGet();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executorService.shutdown();

        assertEquals(1, successCount.get(), "Exactly one user should acquire the hold");
        assertEquals(threadCount - 1, failureCount.get(), "All other users should fail to hold the seat");
        assertEquals(0, errors.size(), "No unexpected errors should be thrown: " + errors);
    }
}
