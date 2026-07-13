package com.example.aiseatbooking.booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class ConfirmBookingRequest {
    @NotBlank(message = "Hold ID is required")
    private String holdId;

    @Positive(message = "Ticket price must be positive")
    private double ticketPrice;
}
