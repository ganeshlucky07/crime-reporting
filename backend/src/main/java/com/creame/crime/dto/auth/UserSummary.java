package com.creame.crime.dto.auth;

import com.creame.crime.model.UserRole;

public record UserSummary(
        String id,
        String name,
        String email,
        UserRole role
) {
}
