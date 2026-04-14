package com.gunes.docker;

import com.gunes.docker.entity.Task;
import com.gunes.docker.entity.User;
import com.gunes.docker.repository.TaskRepository;
import com.gunes.docker.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(UserRepository userRepository, TaskRepository taskRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (taskRepository.count() > 0) {
                return;
            }

            User alex = userRepository.save(new User(
                    null,
                    "Alex Morgan",
                    "Editör Lideri",
                    "alex@fluidtasks.io",
                    "https://ui-avatars.com/api/?name=Alex+Morgan&background=0f6ea8&color=fff",
                    passwordEncoder.encode("123456")
            ));

            User sarah = userRepository.save(new User(
                    null,
                    "Sarah Jones",
                    "UI Tasarım",
                    "sarah@fluidtasks.io",
                    "https://ui-avatars.com/api/?name=Sarah+Jones&background=34d399&color=083344",
                    passwordEncoder.encode("123456")
            ));

            User marcus = userRepository.save(new User(
                    null,
                    "Marcus Tate",
                    "Mühendislik",
                    "marcus@fluidtasks.io",
                    "https://ui-avatars.com/api/?name=Marcus+Tate&background=6366f1&color=fff",
                    passwordEncoder.encode("123456")
            ));

            taskRepository.saveAll(List.of(
                    buildTask(
                            "Q3 Editoryal Stratejiyi Tamamla",
                            "Tüm içerik kolonlarını yeni tasarım sistemiyle hizala ve paydaş toplantısına hazırla.",
                            "IN_PROGRESS",
                            "EDITORIAL",
                            "HIGH",
                            LocalDate.now().plusDays(1),
                            6.0,
                            2.5,
                            alex
                    ),
                    buildTask(
                            "API Geçişini V3 Sürümüne Taşı",
                            "Güncel ekip panosu için backend endpointleri ile frontend bağlarını hizala.",
                            "REVIEW",
                            "TECH",
                            "HIGH",
                            LocalDate.now().plusDays(3),
                            8.0,
                            3.0,
                            marcus
                    ),
                    buildTask(
                            "Ana Sayfa Etkileşim Prototipleri",
                            "Yeni verimlilik deneyimi için hafif hareketler ve kart geçişlerini test et.",
                            "TO_DO",
                            "DESIGN",
                            "MEDIUM",
                            LocalDate.now().plusDays(5),
                            5.0,
                            5.0,
                            sarah
                    ),
                    buildTask(
                            "Sosyal Medya Görsel Paketi",
                            "Kampanya teslimi için son export setini hazırla ve onaylı varyasyonları arşivle.",
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
