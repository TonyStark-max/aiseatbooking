package com.example.aiseatbooking.ai;

import com.example.aiseatbooking.event.Event;
import com.example.aiseatbooking.event.EventService;
import com.example.aiseatbooking.seat.*;
import com.example.aiseatbooking.common.SeatNotAvailableException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AiOrchestrationController {

    private final EventService eventService;
    private final SeatRepository seatRepository;
    private final SeatHoldService seatHoldService;

    @Data
    public static class ChatMessageRequest {
        private String message;
        private Long currentEventId;
        private String userId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessageResponse {
        private String sender;
        private String text;
        private String action; // e.g. "HOLD_SUCCESS", "PROPOSAL", "NONE"
        private HoldResponse holdDetails;
        private AiProposal proposal;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiProposal {
        private Long eventId;
        private String eventName;
        private List<Long> seatIds;
        private List<String> seatLabels;
        private double price;
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatMessageResponse> handleChatMessage(@RequestBody ChatMessageRequest request) {
        String msg = request.getMessage().toLowerCase();
        String userId = request.getUserId();
        if (userId == null || userId.isBlank()) {
            userId = "mock-user-123";
        }
        
        log.info("AI agent processing instruction: '{}' for user: {}, currentEventId: {}", msg, userId, request.getCurrentEventId());

        // Default fallback response
        ChatMessageResponse response = ChatMessageResponse.builder()
                .sender("ai")
                .action("NONE")
                .text("I can help you browse movies/events and book seats immediately. Try saying 'book seats A1 and A2 for Friday rock concert' or 'find 2 adjacent seats for comedy show'.")
                .build();

        // 1. Identify which event/movie the user wants
        Event selectedEvent = null;
        List<Event> allEvents = eventService.getAllEvents();
        
        // Dynamic search based on database items
        for (Event e : allEvents) {
            String nameLower = e.getName().toLowerCase();
            String[] words = nameLower.split("[\\s:(),\\-]+");
            for (String word : words) {
                if (word.length() > 3 && msg.contains(word)) {
                    selectedEvent = e;
                    break;
                }
            }
            if (selectedEvent != null) break;
        }

        // Additional alias mappings
        if (selectedEvent == null) {
            if (msg.contains("rock") || msg.contains("concert") || msg.contains("revival")) {
                selectedEvent = allEvents.stream().filter(e -> e.getName().toLowerCase().contains("rock")).findFirst().orElse(null);
            } else if (msg.contains("comedy") || msg.contains("laugh") || msg.contains("special")) {
                selectedEvent = allEvents.stream().filter(e -> e.getName().toLowerCase().contains("laugh")).findFirst().orElse(null);
            } else if (msg.contains("summit") || msg.contains("tech") || msg.contains("concurrency")) {
                selectedEvent = allEvents.stream().filter(e -> e.getName().toLowerCase().contains("concurrency")).findFirst().orElse(null);
            } else if (msg.contains("dark knight") || msg.contains("batman") || msg.contains("knight")) {
                selectedEvent = allEvents.stream().filter(e -> e.getName().toLowerCase().contains("knight")).findFirst().orElse(null);
            }
        }
        
        // Fallback to active event on frontend if none specified
        if (selectedEvent == null && request.getCurrentEventId() != null) {
            selectedEvent = eventService.getEventById(request.getCurrentEventId()).orElse(null);
        }

        if (selectedEvent == null) {
            StringBuilder sb = new StringBuilder("I couldn't identify which movie/event you want. We have:\n");
            for (int i = 0; i < allEvents.size(); i++) {
                sb.append("• ").append(allEvents.get(i).getName()).append("\n");
            }
            sb.append("Please specify which movie or show you want to book!");
            return ResponseEntity.ok(ChatMessageResponse.builder()
                    .sender("ai")
                    .action("NONE")
                    .text(sb.toString())
                    .build());
        }

        // 2. Parse seat labels from user message (e.g. A1, B2)
        List<String> requestedSeatLabels = new ArrayList<>();
        Pattern seatPattern = Pattern.compile("\\b([a-eA-E][1-8])\\b");
        Matcher matcher = seatPattern.matcher(msg);
        while (matcher.find()) {
            requestedSeatLabels.add(matcher.group(1).toUpperCase());
        }

        // 3. Look up seat entities in DB
        List<Seat> allSeats = seatRepository.findByEventId(selectedEvent.getId());
        List<Seat> targetSeats = new ArrayList<>();

        boolean isBookingAction = msg.contains("book") || msg.contains("reserve") || msg.contains("hold") || msg.contains("get");

        if (!requestedSeatLabels.isEmpty()) {
            // User requested specific seat labels
            for (String label : requestedSeatLabels) {
                allSeats.stream()
                        .filter(s -> s.getSeatLabel().equals(label))
                        .findFirst()
                        .ifPresent(targetSeats::add);
            }

            if (targetSeats.size() != requestedSeatLabels.size()) {
                return ResponseEntity.ok(ChatMessageResponse.builder()
                        .sender("ai")
                        .action("NONE")
                        .text("One or more of the seats you requested ( " + String.join(", ", requestedSeatLabels) + " ) do not exist in this venue.")
                        .build());
            }

            if (isBookingAction) {
                // EXECUTE ACTION: Hold the specific seats
                try {
                    List<Long> seatIds = targetSeats.stream().map(Seat::getId).collect(Collectors.toList());
                    HoldResponse hold = seatHoldService.holdSeats(userId, selectedEvent.getId(), seatIds, 300);
                    
                    return ResponseEntity.ok(ChatMessageResponse.builder()
                            .sender("ai")
                            .action("HOLD_SUCCESS")
                            .text("I have successfully secured a hold on seats " + String.join(", ", requestedSeatLabels) + 
                                    " for the event '" + selectedEvent.getName() + "'. Please complete payment in the checkout panel to confirm.")
                            .holdDetails(hold)
                            .build());
                } catch (SeatNotAvailableException e) {
                    return ResponseEntity.ok(ChatMessageResponse.builder()
                            .sender("ai")
                            .action("NONE")
                            .text("I tried to hold those seats, but " + e.getMessage() + ". Please choose another seat.")
                            .build());
                } catch (Exception e) {
                    return ResponseEntity.ok(ChatMessageResponse.builder()
                            .sender("ai")
                            .action("NONE")
                            .text("An error occurred while booking seats: " + e.getMessage())
                            .build());
                }
            } else {
                // SUGGESTION ONLY
                return ResponseEntity.ok(ChatMessageResponse.builder()
                        .sender("ai")
                        .action("PROPOSAL")
                        .text("I found seats " + String.join(", ", requestedSeatLabels) + " are available for " + 
                                selectedEvent.getName() + ". Would you like me to book them?")
                        .proposal(AiProposal.builder()
                                .eventId(selectedEvent.getId())
                                .eventName(selectedEvent.getName())
                                .seatIds(targetSeats.stream().map(Seat::getId).collect(Collectors.toList()))
                                .seatLabels(requestedSeatLabels)
                                .price(50.0)
                                .build())
                        .build());
            }
        } else {
            // No specific labels mentioned. Let's check if they requested a quantity (e.g. "2 seats", "two tickets")
            int quantity = 1;
            if (msg.contains(" 2 ") || msg.contains("two") || msg.contains("couple")) {
                quantity = 2;
            } else if (msg.contains(" 3 ") || msg.contains("three")) {
                quantity = 3;
            } else if (msg.contains(" 4 ") || msg.contains("four")) {
                quantity = 4;
            }

            // Find available seats for this event
            List<Seat> availableSeats = allSeats.stream()
                    .filter(s -> s.getStatus() == SeatStatus.AVAILABLE)
                    .collect(Collectors.toList());

            if (availableSeats.size() < quantity) {
                return ResponseEntity.ok(ChatMessageResponse.builder()
                        .sender("ai")
                        .action("NONE")
                        .text("I'm sorry, there are not enough seats available for '" + selectedEvent.getName() + "'. Only " + 
                                availableSeats.size() + " seats remain.")
                        .build());
            }

            // Find adjacent seats if possible (same row)
            List<Seat> proposedSeats = new ArrayList<>();
            for (char row = 'A'; row <= 'E'; row++) {
                final char r = row;
                List<Seat> rowSeats = availableSeats.stream()
                        .filter(s -> s.getSeatLabel().charAt(0) == r)
                        .sorted((a, b) -> a.getSeatLabel().compareTo(b.getSeatLabel()))
                        .collect(Collectors.toList());

                // Find contiguous chunk of required size
                for (int i = 0; i <= rowSeats.size() - quantity; i++) {
                    boolean contiguous = true;
                    for (int j = 0; j < quantity - 1; j++) {
                        int num1 = Integer.parseInt(rowSeats.get(i + j).getSeatLabel().substring(1));
                        int num2 = Integer.parseInt(rowSeats.get(i + j + 1).getSeatLabel().substring(1));
                        if (num2 != num1 + 1) {
                            contiguous = false;
                            break;
                        }
                    }
                    if (contiguous) {
                        for (int j = 0; j < quantity; j++) {
                            proposedSeats.add(rowSeats.get(i + j));
                        }
                        break;
                    }
                }
                if (proposedSeats.size() == quantity) break;
            }

            // Fallback: if no contiguous block in same row, just pick first available
            if (proposedSeats.size() < quantity) {
                proposedSeats = availableSeats.subList(0, quantity);
            }

            List<String> proposedLabels = proposedSeats.stream().map(Seat::getSeatLabel).collect(Collectors.toList());
            List<Long> proposedIds = proposedSeats.stream().map(Seat::getId).collect(Collectors.toList());

            if (isBookingAction) {
                // EXECUTE ACTION: Hold the proposed seats automatically
                try {
                    HoldResponse hold = seatHoldService.holdSeats(userId, selectedEvent.getId(), proposedIds, 300);
                    return ResponseEntity.ok(ChatMessageResponse.builder()
                            .sender("ai")
                            .action("HOLD_SUCCESS")
                            .text("I have automatically reserved " + quantity + " adjacent seats (" + String.join(", ", proposedLabels) + 
                                    ") for you at '" + selectedEvent.getName() + "'. Go ahead and pay in the checkout sidebar.")
                            .holdDetails(hold)
                            .build());
                } catch (Exception e) {
                    return ResponseEntity.ok(ChatMessageResponse.builder()
                            .sender("ai")
                            .action("NONE")
                            .text("I tried to hold " + quantity + " seats for you, but they got locked by another request. Let me try finding another set.")
                            .build());
                }
            } else {
                // SUGGESTION ONLY
                return ResponseEntity.ok(ChatMessageResponse.builder()
                        .sender("ai")
                        .action("PROPOSAL")
                        .text("I found " + quantity + " available seats for '" + selectedEvent.getName() + "': " + 
                                String.join(", ", proposedLabels) + ". Would you like me to book them for you?")
                        .proposal(AiProposal.builder()
                                .eventId(selectedEvent.getId())
                                .eventName(selectedEvent.getName())
                                .seatIds(proposedIds)
                                .seatLabels(proposedLabels)
                                .price(50.0)
                                .build())
                        .build());
            }
        }
    }
}
