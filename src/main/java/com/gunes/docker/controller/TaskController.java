package com.gunes.docker.controller;

import com.gunes.docker.dto.TaskOverviewResponse;
import com.gunes.docker.entity.Task;
import com.gunes.docker.repository.TaskRepository;
import com.gunes.docker.service.TaskOverviewService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*") 
public class TaskController {

    private final TaskRepository taskRepository;
    private final TaskOverviewService taskOverviewService;

    public TaskController(TaskRepository taskRepository, TaskOverviewService taskOverviewService) {
        this.taskRepository = taskRepository;
        this.taskOverviewService = taskOverviewService;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @GetMapping("/overview")
    public TaskOverviewResponse getOverview(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department
    ) {
        return taskOverviewService.buildOverview(query, department);
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task updatedTask) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        task.setTitle(updatedTask.getTitle());
        task.setDescription(updatedTask.getDescription());
        task.setStatus(updatedTask.getStatus());
        task.setPriority(updatedTask.getPriority());
        task.setDepartment(updatedTask.getDepartment());
        task.setDueDate(updatedTask.getDueDate());
        task.setEstimatedHours(updatedTask.getEstimatedHours());
        task.setRemainingHours(updatedTask.getRemainingHours());
        task.setAssignee(updatedTask.getAssignee());

        return taskRepository.save(task);
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }

        taskRepository.deleteById(id);
    }
}
