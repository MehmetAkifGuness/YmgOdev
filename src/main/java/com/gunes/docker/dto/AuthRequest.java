package com.gunes.docker.dto;

public record AuthRequest(
        String fullName,
        String email,
        String password
) {
}
