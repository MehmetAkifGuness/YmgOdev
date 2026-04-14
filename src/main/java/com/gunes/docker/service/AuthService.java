package com.gunes.docker.service;

import com.gunes.docker.dto.AuthRequest;
import com.gunes.docker.dto.AuthResponse;
import com.gunes.docker.entity.User;
import com.gunes.docker.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(AuthRequest request) {
        validateRequest(request, true);

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu e-posta zaten kayıtlı");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setTitle("Takım Üyesi");
        user.setEmail(normalizedEmail);
        user.setAvatarUrl("https://ui-avatars.com/api/?name=" + request.fullName().trim().replace(" ", "+") + "&background=0f6ea8&color=fff");
        user.setPasswordHash(passwordEncoder.encode(request.password()));

        return toResponse(userRepository.save(user));
    }

    public AuthResponse login(AuthRequest request) {
        validateRequest(request, false);

        User user = userRepository.findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-posta veya şifre hatalı"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-posta veya şifre hatalı");
        }

        return toResponse(user);
    }

    public User getUserEntity(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
    }

    private void validateRequest(AuthRequest request, boolean requiresName) {
        if (request == null || request.email() == null || request.email().isBlank() || request.password() == null || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-posta ve şifre zorunludur");
        }

        if (requiresName && (request.fullName() == null || request.fullName().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ad soyad zorunludur");
        }
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getTitle(), user.getEmail(), user.getAvatarUrl());
    }
}
