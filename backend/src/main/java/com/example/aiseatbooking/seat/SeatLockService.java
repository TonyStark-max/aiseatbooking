package com.example.aiseatbooking.seat;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SeatLockService {

    private final SeatRepository seatRepository;

    @Transactional(propagation = Propagation.REQUIRED)
    public List<Seat> acquireLocks(List<Long> seatIds) {
        return seatRepository.findAllByIdInForUpdate(seatIds);
    }
}
