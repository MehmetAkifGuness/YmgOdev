package com.gunes.docker.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "users") // PostgreSQL'de "user" kelimesi rezerve olduğu için tablo adını "users" yapıyoruz
@Data // Lombok: Getter, Setter, toString metodlarını otomatik yazar
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;
    private String title; // Örn: Editorial Lead, UI Design
    private String email;
    private String avatarUrl; // Profil fotoğrafı linki
}