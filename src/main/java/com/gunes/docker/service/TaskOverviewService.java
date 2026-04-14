package com.gunes.docker.service;

import com.gunes.docker.dto.TaskOverviewResponse;
import com.gunes.docker.entity.Task;
import com.gunes.docker.entity.User;
import com.gunes.docker.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TaskOverviewService {

    private static final List<String> STATUS_ORDER = List.of("TO_DO", "IN_PROGRESS", "REVIEW", "DONE");
    private static final List<String> DEPARTMENT_ORDER = List.of("EDITORIAL", "DESIGN", "TECH", "PRODUCT", "MARKETING");

    private final TaskRepository taskRepository;

    public TaskOverviewService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public TaskOverviewResponse buildOverview(String query, String department) {
        List<Task> allTasks = taskRepository.findAll();
        List<Task> filteredTasks = allTasks.stream()
                .filter(task -> matchesQuery(task, query))
                .filter(task -> matchesDepartment(task, department))
                .toList();

        User profileUser = filteredTasks.stream()
                .map(Task::getAssignee)
                .filter(Objects::nonNull)
                .findFirst()
                .orElseGet(() -> allTasks.stream()
                        .map(Task::getAssignee)
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse(null));

        return new TaskOverviewResponse(
                filteredTasks,
                buildProfile(profileUser),
                buildDashboard(filteredTasks),
                buildGroupWorkspace(filteredTasks),
                buildCalendar(filteredTasks),
                buildAnalytics(filteredTasks)
        );
    }

    private TaskOverviewResponse.ProfileSummary buildProfile(User user) {
        if (user == null) {
            return new TaskOverviewResponse.ProfileSummary("Team Member", "Contributor", null);
        }

        return new TaskOverviewResponse.ProfileSummary(user.getFullName(), user.getTitle(), user.getAvatarUrl());
    }

    private TaskOverviewResponse.DashboardSummary buildDashboard(List<Task> tasks) {
        Task focusTask = getPrimaryTask(tasks);
        List<Task> secondaryTasks = tasks.stream()
                .filter(task -> focusTask == null || !Objects.equals(task.getId(), focusTask.getId()))
                .limit(3)
                .toList();

        int completionRate = tasks.isEmpty() ? 0 : Math.round((tasks.stream().filter(task -> "DONE".equals(task.getStatus())).count() * 100f) / tasks.size());
        double estimatedHours = sumOf(tasks, Task::getEstimatedHours);
        double remainingHours = sumOf(tasks, Task::getRemainingHours);
        double efficiencyHours = Math.max(0, estimatedHours - remainingHours);

        String dateLabel = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.ENGLISH));
        String insightTitle = focusTask == null
                ? "Your strongest focus window is waiting to be filled."
                : focusTask.getTitle() + " fits best in your 10:00 - 12:00 focus block.";
        String insightText = focusTask == null
                ? "Create a task to generate personalized focus recommendations."
                : priorityLabel(focusTask.getPriority()) + " intensity is high. Placing this task in the morning deep-work window will improve delivery.";

        return new TaskOverviewResponse.DashboardSummary(
                "Today's Flow",
                dateLabel + " - You have " + tasks.stream().filter(task -> "HIGH".equals(task.getPriority())).count() + " critical focuses.",
                focusTask == null ? "Project: Editorial Flow Refresh" : "Project: " + focusTask.getTitle(),
                focusTask,
                secondaryTasks,
                efficiencyHours,
                completionRate,
                estimatedHours,
                remainingHours,
                buildTimeSlots(tasks, focusTask),
                insightTitle,
                insightText
        );
    }

    private List<TaskOverviewResponse.TimeSlot> buildTimeSlots(List<Task> tasks, Task focusTask) {
        Task secondary = tasks.stream()
                .filter(task -> focusTask == null || !Objects.equals(task.getId(), focusTask.getId()))
                .findFirst()
                .orElse(null);

        Task third = tasks.stream()
                .filter(task -> focusTask == null || !Objects.equals(task.getId(), focusTask.getId()))
                .filter(task -> secondary == null || !Objects.equals(task.getId(), secondary.getId()))
                .findFirst()
                .orElse(null);

        return List.of(
                new TaskOverviewResponse.TimeSlot("09:00", focusTask == null ? "Deep Work" : focusTask.getTitle(), "green"),
                new TaskOverviewResponse.TimeSlot("11:30", "Free Slot - 45m available", "outline"),
                new TaskOverviewResponse.TimeSlot("12:30", secondary == null ? "Lunch Break" : secondary.getTitle(), "violet"),
                new TaskOverviewResponse.TimeSlot("14:00", third == null ? "Team Sync" : third.getTitle(), "blue")
        );
    }

    private TaskOverviewResponse.GroupWorkspaceSummary buildGroupWorkspace(List<Task> tasks) {
        int velocityPercent = tasks.isEmpty() ? 0 : Math.round((tasks.stream().filter(task -> "DONE".equals(task.getStatus())).count() * 100f) / tasks.size());
        int dueSoon = (int) tasks.stream()
                .map(Task::getDueDate)
                .filter(Objects::nonNull)
                .mapToLong(this::daysUntil)
                .filter(days -> days >= 0 && days <= 3)
                .count();
        int activeSprints = (int) tasks.stream().filter(task -> !"DONE".equals(task.getStatus())).count();

        String riskLevel = velocityPercent > 65 ? "Low" : velocityPercent > 35 ? "Moderate" : "High";

        List<String> departmentTabs = new ArrayList<>();
        departmentTabs.add("ALL");
        departmentTabs.addAll(DEPARTMENT_ORDER);

        List<TaskOverviewResponse.PresenceSummary> presence = tasks.stream()
                .map(Task::getAssignee)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(User::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new))
                .values()
                .stream()
                .map(user -> new TaskOverviewResponse.PresenceSummary(
                        user.getId(),
                        user.getFullName(),
                        user.getTitle(),
                        user.getAvatarUrl(),
                        (user.getId() % 3 == 0) ? "Away" : "Online"
                ))
                .toList();

        Map<String, List<Task>> kanban = new LinkedHashMap<>();
        for (String status : STATUS_ORDER) {
            kanban.put(status, tasks.stream().filter(task -> status.equals(task.getStatus())).toList());
        }

        return new TaskOverviewResponse.GroupWorkspaceSummary(
                velocityPercent,
                activeSprints,
                dueSoon,
                riskLevel,
                departmentTabs,
                presence,
                kanban
        );
    }

    private TaskOverviewResponse.CalendarSummary buildCalendar(List<Task> tasks) {
        String monthLabel = LocalDate.now().getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + LocalDate.now().getYear();
        List<Task> unscheduledTasks = tasks.stream().limit(3).toList();
        List<String> hours = List.of("08 AM", "09 AM", "10 AM", "11 AM", "02 PM");

        List<TaskOverviewResponse.CalendarEvent> events = new ArrayList<>();
        for (int index = 0; index < Math.min(tasks.size(), 5); index++) {
            Task task = tasks.get(index);
            events.add(new TaskOverviewResponse.CalendarEvent(
                    task.getId(),
                    task.getTitle(),
                    switch (index) {
                        case 0 -> "08:30 - 10:15";
                        case 1 -> "09:00 - 10:00";
                        case 2 -> "10:00 - 12:30";
                        case 3 -> "11:00 - 12:00";
                        default -> "14:00 - 15:00";
                    },
                    index % 5,
                    hours.get(index),
                    switch (index % 3) {
                        case 1 -> "green";
                        case 2 -> "violet";
                        default -> "blue";
                    }
            ));
        }

        return new TaskOverviewResponse.CalendarSummary(monthLabel, unscheduledTasks, events);
    }

    private TaskOverviewResponse.AnalyticsSummary buildAnalytics(List<Task> tasks) {
        int completionRate = tasks.isEmpty() ? 0 : Math.round((tasks.stream().filter(task -> "DONE".equals(task.getStatus())).count() * 100f) / tasks.size());

        List<TaskOverviewResponse.BreakdownItem> statusBreakdown = STATUS_ORDER.stream()
                .map(status -> breakdownItem(statusLabel(status), (int) tasks.stream().filter(task -> status.equals(task.getStatus())).count(), tasks.size()))
                .toList();

        List<TaskOverviewResponse.BreakdownItem> departmentBreakdown = DEPARTMENT_ORDER.stream()
                .map(department -> breakdownItem(departmentLabel(department), (int) tasks.stream().filter(task -> department.equals(task.getDepartment())).count(), tasks.size()))
                .toList();

        return new TaskOverviewResponse.AnalyticsSummary(completionRate, statusBreakdown, departmentBreakdown);
    }

    private TaskOverviewResponse.BreakdownItem breakdownItem(String label, int count, int total) {
        int percentage = total == 0 ? 0 : Math.round((count * 100f) / total);
        return new TaskOverviewResponse.BreakdownItem(label, count, percentage);
    }

    private Task getPrimaryTask(List<Task> tasks) {
        return tasks.stream()
                .sorted(Comparator
                        .comparingInt((Task task) -> priorityScore(task.getPriority())).reversed()
                        .thenComparingLong(task -> daysUntil(task.getDueDate())))
                .findFirst()
                .orElse(null);
    }

    private int priorityScore(String priority) {
        return switch (priority == null ? "" : priority) {
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            default -> 1;
        };
    }

    private long daysUntil(LocalDate dueDate) {
        if (dueDate == null) {
            return Long.MAX_VALUE;
        }
        return dueDate.toEpochDay() - LocalDate.now().toEpochDay();
    }

    private boolean matchesQuery(Task task, String query) {
        if (query == null || query.isBlank()) {
            return true;
        }

        String normalized = query.toLowerCase(Locale.ROOT);
        return Arrays.asList(
                        task.getTitle(),
                        task.getDescription(),
                        task.getStatus(),
                        task.getPriority(),
                        task.getDepartment(),
                        task.getAssignee() == null ? null : task.getAssignee().getFullName()
                ).stream()
                .filter(Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(normalized));
    }

    private boolean matchesDepartment(Task task, String department) {
        return department == null || department.isBlank() || "ALL".equalsIgnoreCase(department) || department.equalsIgnoreCase(task.getDepartment());
    }

    private double sumOf(List<Task> tasks, Function<Task, Double> extractor) {
        return tasks.stream().map(extractor).filter(Objects::nonNull).mapToDouble(Double::doubleValue).sum();
    }

    private String priorityLabel(String priority) {
        return switch (priority == null ? "" : priority) {
            case "HIGH" -> "High Priority";
            case "MEDIUM" -> "Medium Priority";
            default -> "Low Priority";
        };
    }

    private String statusLabel(String status) {
        return switch (status) {
            case "TO_DO" -> "To Do";
            case "IN_PROGRESS" -> "In Progress";
            case "REVIEW" -> "Review";
            case "DONE" -> "Done";
            default -> status;
        };
    }

    private String departmentLabel(String department) {
        return switch (department) {
            case "EDITORIAL" -> "Editorial";
            case "DESIGN" -> "Design";
            case "TECH" -> "Tech";
            case "PRODUCT" -> "Product";
            case "MARKETING" -> "Marketing";
            default -> department;
        };
    }
}
