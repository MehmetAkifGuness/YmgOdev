package com.gunes.docker.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    
    // Görevin durumu: TO_DO, IN_PROGRESS, REVIEW, DONE
    private String status; 
    
    // Hangi departmana ait: EDITORIAL, TECH, DESIGN, PRODUCT vb.
    private String department; 

    private LocalDate dueDate; // Son teslim tarihi
    
    private Integer estimatedHours; // Tahmini efor

    // Şimdilik görevleri bir kullanıcıya atıyoruz (Many-to-One ilişkisi)
    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private User assignee;
}