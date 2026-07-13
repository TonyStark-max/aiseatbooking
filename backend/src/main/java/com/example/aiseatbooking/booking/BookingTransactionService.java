package com.example.aiseatbooking.booking;

import com.example.aiseatbooking.payment.MockPaymentService;
import com.example.aiseatbooking.seat.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingTransactionService {

    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final MockPaymentService paymentService;
    private final StringRedisTemplate redisTemplate;

    private static final String REDIS_SEAT_HOLD_PREFIX = "hold:seat:";
    private static final String REDIS_ID_HOLD_PREFIX = "hold:id:";

    @Transactional
    public Booking processBookingTransaction(HoldData holdData, double amount) {
        log.info("Starting database transaction for booking hold {}", holdData.getHoldId());

        List<Long> seatIds = holdData.getSeatIds();
        List<Long> sortedSeatIds = new ArrayList<>(seatIds);
        sortedSeatIds.sort(Long::compareTo);

        // Acquire DB lock on seats to prevent race conditions during state transition
        List<Seat> seats = seatRepository.findAllByIdInForUpdate(sortedSeatIds);

        for (Seat seat : seats) {
            if (seat.getStatus() == SeatStatus.BOOKED) {
                throw new IllegalStateException("Seat " + seat.getSeatLabel() + " is already booked");
            }
        }

        // Call payment processor (might throw PaymentFailedException)
        paymentService.processPayment(holdData.getUserId(), amount);

        // Create booking record
        Booking booking = Booking.builder()
                .userId(holdData.getUserId())
                .eventId(holdData.getEventId())
                .status(BookingStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();
        booking = bookingRepository.save(booking);

        // Update seats to BOOKED state and link to the booking
        for (Seat seat : seats) {
            seat.setStatus(SeatStatus.BOOKED);
            seat.setBooking(booking);
        }
        seatRepository.saveAll(seats);

        // Clear Redis holds
        redisTemplate.delete(REDIS_ID_HOLD_PREFIX + holdData.getHoldId());
        for (Seat seat : seats) {
            redisTemplate.delete(REDIS_SEAT_HOLD_PREFIX + seat.getId());
        }

        log.info("Booking transaction committed. Booking ID: {}", booking.getId());
        // TODO: Broadcast updates to real-time clients

        return booking;
    }
}
