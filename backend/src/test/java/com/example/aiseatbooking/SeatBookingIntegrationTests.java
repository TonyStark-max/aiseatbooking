package com.example.aiseatbooking;

import com.example.aiseatbooking.booking.Booking;
import com.example.aiseatbooking.booking.BookingService;
import com.example.aiseatbooking.booking.BookingStatus;
import com.example.aiseatbooking.common.PaymentFailedException;
import com.example.aiseatbooking.common.SeatNotAvailableException;
import com.example.aiseatbooking.event.Event;
import com.example.aiseatbooking.event.EventRepository;
import com.example.aiseatbooking.payment.MockPaymentService;
import com.example.aiseatbooking.seat.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class SeatBookingIntegrationTests {

    @Autowired
    private SeatHoldService seatHoldService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private MockPaymentService paymentService;

    private Long eventId;
    private Long seatId;

    @BeforeEach
    public void setup() {
        seatRepository.deleteAll();
        eventRepository.deleteAll();

        Event event = Event.builder()
                .name("Integration Test Event")
                .venue("Main Stage")
                .datetime(LocalDateTime.now().plusDays(2))
                .totalSeats(1)
                .build();
        event = eventRepository.save(event);
        eventId = event.getId();

        Seat seat = Seat.builder()
                .event(event)
                .seatLabel("B1")
                .status(SeatStatus.AVAILABLE)
                .build();
        seat = seatRepository.save(seat);
        seatId = seat.getId();
    }

    @Test
    public void testSuccessfulBookingLifecycle() {
        paymentService.setFailureRate(0.0);

        HoldResponse hold = seatHoldService.holdSeats("user-abc", eventId, List.of(seatId), 60);
        assertNotNull(hold.getHoldId());

        Seat seatAfterHold = seatRepository.findById(seatId).orElseThrow();
        assertEquals(SeatStatus.HELD, seatAfterHold.getStatus());

        Booking booking = bookingService.confirmBooking(hold.getHoldId(), "idempotency-key-123", 50.0);
        assertNotNull(booking.getId());
        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());

        Seat seatAfterBooking = seatRepository.findById(seatId).orElseThrow();
        assertEquals(SeatStatus.BOOKED, seatAfterBooking.getStatus());
        assertNotNull(seatAfterBooking.getBooking());
        assertEquals(booking.getId(), seatAfterBooking.getBooking().getId());

        assertThrows(SeatNotAvailableException.class, () -> {
            seatHoldService.holdSeats("user-xyz", eventId, List.of(seatId), 60);
        });
    }

    @Test
    public void testBookingPaymentFailureCompensatingRelease() {
        paymentService.setFailureRate(1.0);

        HoldResponse hold = seatHoldService.holdSeats("user-abc", eventId, List.of(seatId), 60);
        assertNotNull(hold.getHoldId());

        assertThrows(PaymentFailedException.class, () -> {
            bookingService.confirmBooking(hold.getHoldId(), "idempotency-key-456", 50.0);
        });

        Seat seatAfterFail = seatRepository.findById(seatId).orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, seatAfterFail.getStatus());
        assertNull(seatAfterFail.getBooking());

        assertNull(seatHoldService.getHoldData(hold.getHoldId()));
        assertNull(seatHoldService.getSeatHoldOwner(seatId));
    }
}
