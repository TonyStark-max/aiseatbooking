package com.example.aiseatbooking.seat;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SeatController {

    private final SeatRepository seatRepository;
    private final SeatHoldService seatHoldService;

    @GetMapping("/api/seats")
    public ResponseEntity<List<Seat>> getSeatsByEvent(@RequestParam Long eventId) {
        return ResponseEntity.ok(seatRepository.findByEventId(eventId));
    }

    @PostMapping("/api/holds")
    public ResponseEntity<HoldResponse> holdSeats(
            @RequestHeader(value = "X-User-Id", defaultValue = "mock-user-123") String userId,
            @Valid @RequestBody HoldRequest request) {
        // Default TTL is 5 minutes (300 seconds)
        HoldResponse response = seatHoldService.holdSeats(userId, request.getEventId(), request.getSeatIds(), 300);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/api/holds/{holdId}")
    public ResponseEntity<Void> releaseHold(@PathVariable String holdId) {
        seatHoldService.releaseHold(holdId);
        return ResponseEntity.noContent().build();
    }
}
