package com.example.aiseatbooking.seat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoldResponse {
    private String holdId;
    private Long eventId;
    private List<Long> seatIds;
    private long expiresAt; // Epoch millisecond timestamp
}
