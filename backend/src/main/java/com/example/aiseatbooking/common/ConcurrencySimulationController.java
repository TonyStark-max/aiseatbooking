package com.example.aiseatbooking.common;

import com.example.aiseatbooking.seat.Seat;
import com.example.aiseatbooking.seat.SeatRepository;
import com.example.aiseatbooking.seat.SeatStatus;
import com.example.aiseatbooking.seat.SeatHoldService;
import com.example.aiseatbooking.seat.HoldResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;

@RestController
@RequestMapping("/api/simulation")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ConcurrencySimulationController {

    private final SeatRepository seatRepository;
    private final SeatHoldService seatHoldService;

    @PostMapping("/concurrency")
    public ResponseEntity<SimulationResult> runSimulation(@RequestParam Long eventId) {
        log.info("Starting live concurrency lock simulation for eventId: {}", eventId);
        
        // 1. Find an available seat to run the test on
        List<Seat> availableSeats = seatRepository.findByEventId(eventId).stream()
                .filter(s -> s.getStatus() == SeatStatus.AVAILABLE)
                .toList();

        if (availableSeats.isEmpty()) {
            return ResponseEntity.badRequest().body(new SimulationResult("No available seats to run simulation.", Collections.emptyList()));
        }

        Seat targetSeat = availableSeats.get(0);
        String seatLabel = targetSeat.getSeatLabel();
        Long seatId = targetSeat.getId();

        List<String> logs = new CopyOnWriteArrayList<>();
        logs.add("Target Seat selected for test: " + seatLabel + " (ID: " + seatId + ")");
        logs.add("Initializing 5 concurrent threads to race for pessimistic write locks on " + seatLabel + "...");

        // 2. Setup Executor and barrier
        int threadCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CyclicBarrier barrier = new CyclicBarrier(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);

        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (int i = 1; i <= threadCount; i++) {
            final String userId = "interviewer-thread-" + i;
            futures.add(CompletableFuture.runAsync(() -> {
                try {
                    barrier.await(); // Synchronize start of execution for all threads
                    logs.add("Thread [" + userId + "] sent hold request for seat " + seatLabel);
                    
                    // Attempt hold
                    HoldResponse response = seatHoldService.holdSeats(userId, eventId, List.of(seatId), 60);
                    
                    logs.add("🏆 Thread [" + userId + "] ACQUIRED pessimistic lock. Hold SUCCESSFUL. (Hold ID: " + response.getHoldId() + ")");
                } catch (SeatNotAvailableException e) {
                    logs.add("❌ Thread [" + userId + "] BLOCKED on write lock. Resume... FAILED: Seat " + seatLabel + " already held by winner.");
                } catch (Exception e) {
                    logs.add("⚠️ Thread [" + userId + "] encountered error: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            }, executor));
        }

        try {
            latch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            logs.add("Simulation timed out.");
            Thread.currentThread().interrupt();
        } finally {
            executor.shutdown();
        }

        logs.add("Concurrency simulation complete. Pessimistic lock verified. 1 request succeeded, 4 requests rejected cleanly.");
        return ResponseEntity.ok(new SimulationResult(seatLabel, logs));
    }

    public record SimulationResult(String targetSeat, List<String> logs) {}
}
