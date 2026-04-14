package com.gunes.docker.dto;

public record AuthResponse(
        Long id,
        String fullName,
        String title,
        String email,
        String avatarUrl
) {
}
