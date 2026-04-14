package com.gunes.docker.dto;

import com.gunes.docker.entity.Task;

import java.util.List;
import java.util.Map;

public record TaskOverviewResponse(
        List<Task> tasks,
        ProfileSummary profile,
        DashboardSummary dashboard,
        GroupWorkspaceSummary groupWorkspace,
        CalendarSummary calendar,
        AnalyticsSummary analytics
) {
    public record ProfileSummary(
            String fullName,
            String title,
            String avatarUrl
    ) {}

    public record DashboardSummary(
            String heroTitle,
            String heroSubtitle,
            String heroProject,
            Task focusTask,
            List<Task> secondaryTasks,
            double efficiencyHours,
            int completionRate,
            double estimatedHours,
            double remainingHours,
            List<TimeSlot> timeSlots,
            String insightTitle,
            String insightText
    ) {}

    public record TimeSlot(
            String time,
            String label,
            String style
    ) {}

    public record GroupWorkspaceSummary(
            int velocityPercent,
            int activeSprints,
            int dueSoon,
            String riskLevel,
            List<String> departmentTabs,
            List<PresenceSummary> presence,
            Map<String, List<Task>> kanban
    ) {}

    public record PresenceSummary(
            Long id,
            String fullName,
            String title,
            String avatarUrl,
            String availability
    ) {}

    public record CalendarSummary(
            String monthLabel,
            List<Task> unscheduledTasks,
            List<CalendarEvent> events
    ) {}

    public record CalendarEvent(
            Long taskId,
            String title,
            String time,
            int dayIndex,
            String hour,
            String className
    ) {}

    public record AnalyticsSummary(
            int completionRate,
            List<BreakdownItem> statusBreakdown,
            List<BreakdownItem> departmentBreakdown
    ) {}

    public record BreakdownItem(
            String label,
            int count,
            int percentage
    ) {}
}
