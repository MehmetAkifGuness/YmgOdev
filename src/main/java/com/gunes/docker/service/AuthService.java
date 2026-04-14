package com.gunes.docker.service;

import com.gunes.docker.dto.AuthRequest;
import com.gunes.docker.dto.AuthResponse;
import com.gunes.docker.entity.User;
import com.gunes.docker.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AuthService {
    private static final String EMAIL_REGEX = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(AuthRequest request) {
        validateRequest(request, true);

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        log.info("Kayıt akışı başladı. email={}", normalizedEmail);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            log.warn("Kayıt reddedildi. email={} zaten kayıtlı", normalizedEmail);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu e-posta zaten kayıtlı");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setTitle("Takım Üyesi");
        user.setEmail(normalizedEmail);
        user.setAvatarUrl("https://ui-avatars.com/api/?name=" + request.fullName().trim().replace(" ", "+") + "&background=0f6ea8&color=fff");
        user.setPasswordHash(passwordEncoder.encode(request.password()));

        User savedUser = userRepository.save(user);
        log.info("Kullanıcı veritabanına kaydedildi. id={}, email={}", savedUser.getId(), savedUser.getEmail());
        return toResponse(savedUser);
    }

    public AuthResponse login(AuthRequest request) {
        validateRequest(request, false);

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        log.info("Giriş akışı başladı. email={}", normalizedEmail);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> {
                    log.warn("Giriş başarısız. Kullanıcı veritabanında bulunamadı. email={}", normalizedEmail);
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-posta veya şifre hatalı");
                });

        log.info("Kullanıcı veritabanından okundu. id={}, email={}", user.getId(), user.getEmail());

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("Giriş başarısız. Şifre eşleşmedi. email={}", normalizedEmail);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-posta veya şifre hatalı");
        }

        log.info("Giriş başarılı. id={}, email={}", user.getId(), user.getEmail());
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

        if (!request.email().trim().matches(EMAIL_REGEX)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçerli bir e-posta adresi girin");
        }

        if (request.password().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Şifre en az 6 karakter olmalıdır");
        }

        if (requiresName && (request.fullName() == null || request.fullName().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ad soyad zorunludur");
        }
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getTitle(), user.getEmail(), user.getAvatarUrl());
    }
}
