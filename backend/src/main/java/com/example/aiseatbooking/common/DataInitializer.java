package com.example.aiseatbooking.common;

import com.example.aiseatbooking.event.Event;
import com.example.aiseatbooking.event.EventRepository;
import com.example.aiseatbooking.seat.Seat;
import com.example.aiseatbooking.seat.SeatRepository;
import com.example.aiseatbooking.seat.SeatStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;

    @Override
    public void run(String... args) throws Exception {
        if (eventRepository.count() == 0) {
            log.info("Database is empty. Seeding demo events and seat layouts...");

            // Create Event 1: Tollywood - Kalki 2898 AD
            Event kalki = Event.builder()
                    .name("Kalki 2898 AD (Epic Sci-Fi)")
                    .venue("Prasads IMAX Screen 1")
                    .datetime(LocalDateTime.now().plusDays(1).withHour(18).withMinute(30).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            kalki = eventRepository.save(kalki);
            generateSeatsForEvent(kalki);

            // Create Event 2: Tollywood - Devara
            Event devara = Event.builder()
                    .name("Devara: Part 1")
                    .venue("AMB Cinemas Screen 3")
                    .datetime(LocalDateTime.now().plusDays(2).withHour(21).withMinute(0).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            devara = eventRepository.save(devara);
            generateSeatsForEvent(devara);

            // Create Event 3: Tollywood - Pushpa 2
            Event pushpa = Event.builder()
                    .name("Pushpa 2: The Rule")
                    .venue("Bramaramba Theater")
                    .datetime(LocalDateTime.now().plusDays(3).withHour(19).withMinute(0).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            pushpa = eventRepository.save(pushpa);
            generateSeatsForEvent(pushpa);

            // Create Event 4: Tollywood - Salaar
            Event salaar = Event.builder()
                    .name("Salaar: Part 1 - Ceasefire")
                    .venue("PVR Nexus Screen 4")
                    .datetime(LocalDateTime.now().plusDays(4).withHour(20).withMinute(30).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            salaar = eventRepository.save(salaar);
            generateSeatsForEvent(salaar);

            // Create Event 5: Hollywood - Deadpool & Wolverine
            Event deadpool = Event.builder()
                    .name("Deadpool & Wolverine (Marvel)")
                    .venue("Dolby Cinema Screen 2")
                    .datetime(LocalDateTime.now().plusDays(5).withHour(21).withMinute(15).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            deadpool = eventRepository.save(deadpool);
            generateSeatsForEvent(deadpool);

            // Create Event 6: Hollywood - Inside Out 2
            Event insideout = Event.builder()
                    .name("Inside Out 2 (Pixar Animation)")
                    .venue("Family Cinema Screen 5")
                    .datetime(LocalDateTime.now().plusDays(2).withHour(14).withMinute(0).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            insideout = eventRepository.save(insideout);
            generateSeatsForEvent(insideout);

            // Create Event 7: Hollywood - Furiosa
            Event furiosa = Event.builder()
                    .name("Furiosa: A Mad Max Saga")
                    .venue("IMAX Theater Screen 3")
                    .datetime(LocalDateTime.now().plusDays(6).withHour(22).withMinute(0).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            furiosa = eventRepository.save(furiosa);
            generateSeatsForEvent(furiosa);

            // Create Event 8: Hollywood - Dune 2
            Event dune = Event.builder()
                    .name("Dune: Part Two (Director's Cut)")
                    .venue("Grand Cinema Screen 1")
                    .datetime(LocalDateTime.now().plusDays(7).withHour(19).withMinute(45).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            dune = eventRepository.save(dune);
            generateSeatsForEvent(dune);

            // Create Event 9: Hollywood - Oppenheimer
            Event oppenheimer = Event.builder()
                    .name("Oppenheimer (70mm Experience)")
                    .venue("IMAX Theater Screen 2")
                    .datetime(LocalDateTime.now().plusDays(8).withHour(17).withMinute(30).withSecond(0).withNano(0))
                    .totalSeats(40)
                    .build();
            oppenheimer = eventRepository.save(oppenheimer);
            generateSeatsForEvent(oppenheimer);

            log.info("Demo data seeding completed successfully.");
        } else {
            log.info("Database already contains event data. Skipping seed script.");
        }
    }

    private void generateSeatsForEvent(Event event) {
        List<Seat> seats = new ArrayList<>();
        char[] rows = {'A', 'B', 'C', 'D', 'E'};
        int seatsPerRow = 8;

        for (char row : rows) {
            for (int col = 1; col <= seatsPerRow; col++) {
                String seatLabel = "" + row + col;
                seats.add(Seat.builder()
                        .event(event)
                        .seatLabel(seatLabel)
                        .status(SeatStatus.AVAILABLE)
                        .build());
            }
        }
        seatRepository.saveAll(seats);
        log.info("Generated {} seats for event: {}", seats.size(), event.getName());
    }
}
