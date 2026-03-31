package com.creame.crime.dto.auth;

public record AuthResponse(
        String token,
        UserSummary user
) {
}
