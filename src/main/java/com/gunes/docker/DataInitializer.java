package com.gunes.docker;

import com.gunes.docker.entity.Task;
import com.gunes.docker.entity.User;
import com.gunes.docker.repository.TaskRepository;
import com.gunes.docker.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(UserRepository userRepository, TaskRepository taskRepository) {
        return args -> {
            if (taskRepository.count() > 0) {
                return;
            }

            User alex = userRepository.save(new User(
                    null,
                    "Alex Morgan",
                    "Editorial Lead",
                    "alex@fluidtasks.io",
                    "https://ui-avatars.com/api/?name=Alex+Morgan&background=0f6ea8&color=fff"
            ));

            User sarah = userRepository.save(new User(
                    null,
                    "Sarah Jones",
                    "UI Design",
                    "sarah@fluidtasks.io",
                    "https://ui-avatars.com/api/?name=Sarah+Jones&background=34d399&color=083344"
            ));

            User marcus = userRepository.save(new User(
                    null,
                    "Marcus Tate",
                    "Engineering",
                    "marcus@fluidtasks.io",
                    "https://ui-avatars.com/api/?name=Marcus+Tate&background=6366f1&color=fff"
            ));

            taskRepository.saveAll(List.of(
                    buildTask(
                            "Finalize Q3 Editorial Strategy",
                            "Review all content pillars and align them with the refreshed design system before stakeholder review.",
                            "IN_PROGRESS",
                            "EDITORIAL",
                            "HIGH",
                            LocalDate.now().plusDays(1),
                            6.0,
                            2.5,
                            alex
                    ),
                    buildTask(
                            "API Migration to V3",
                            "Coordinate backend endpoints and frontend bindings for the updated collaboration board.",
                            "REVIEW",
                            "TECH",
                            "HIGH",
                            LocalDate.now().plusDays(3),
                            8.0,
                            3.0,
                            marcus
                    ),
                    buildTask(
                            "Homepage Interaction Prototypes",
                            "Test lightweight motion and card transitions for the new productivity experience.",
                            "TO_DO",
                            "DESIGN",
                            "MEDIUM",
                            LocalDate.now().plusDays(5),
                            5.0,
                            5.0,
                            sarah
                    ),
                    buildTask(
                            "Social Media Asset Package",
                            "Prepare final export set for campaign delivery and archive the approved variants.",
                            "DONE",
                            "MARKETING",
                            "LOW",
                            LocalDate.now().minusDays(1),
                            4.0,
                            0.0,
                            alex
                    )
            ));
        };
    }

    private Task buildTask(
            String title,
            String description,
            String status,
            String department,
            String priority,
            LocalDate dueDate,
            Double estimatedHours,
            Double remainingHours,
            User assignee
    ) {
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setStatus(status);
        task.setDepartment(department);
        task.setPriority(priority);
        task.setDueDate(dueDate);
        task.setEstimatedHours(estimatedHours);
        task.setRemainingHours(remainingHours);
        task.setAssignee(assignee);
        return task;
    }
}
