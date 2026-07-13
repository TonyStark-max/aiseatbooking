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
public class HoldData {
    private String holdId;
    private String userId;
    private Long eventId;
    private List<Long> seatIds;
    private long expiresAt;
}
