package com.gunes.docker.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Hashtable;
import java.util.HexFormat;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    @Value("${github.webhook.secret}")
    private String secret;

    @PostMapping("/github")
    public ResponseEntity<String> handleGithubWebhook(
            @RequestHeader("X-Hub-Signature-256") String signature,
            @RequestBody String payload) {

        if (!isValidSignature(signature, payload)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Geçersiz İmza");
        }

        // Burada yapmak istediğiniz işlemi tanımlayın (Örn: Log basma, veritabanı güncelleme)
        System.out.println("GitHub'dan başarılı push bildirimi alındı!");
        
        return ResponseEntity.ok("Webhook başarıyla alındı");
    }

    private boolean isValidSignature(String signature, String payload) {
        try {
            Hashtable<String, String> result = new Hashtable<>();
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            
            byte[] hash = hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = "sha256=" + HexFormat.of().formatHex(hash);
            
            return expectedSignature.equals(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            return false;
        }
    }
}