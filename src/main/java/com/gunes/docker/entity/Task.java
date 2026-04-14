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
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String status; // TO_DO, IN_PROGRESS, REVIEW, DONE
    private String department; // EDITORIAL, TECH, DESIGN, PRODUCT
    private String priority; // HIGH, MEDIUM, LOW

    private LocalDate dueDate;
    private Double estimatedHours; 
    private Double remainingHours; // Efficiency Pulse için

    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private User assignee;
}