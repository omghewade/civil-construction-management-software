package com.civil.scheduler.controller;

import com.civil.scheduler.dto.LoginRequest;
import com.civil.scheduler.entity.Role;
import com.civil.scheduler.entity.User;
import com.civil.scheduler.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PersistenceContext
    private EntityManager entityManager;

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;

        // Setup initial admin if not present
        if (userRepository.count() == 0) {
            User admin = new User("admin", passwordEncoder.encode("admin"), "System Administrator", Role.ROLE_ADMIN);
            User pm = new User("pm", passwordEncoder.encode("pm"), "Project Manager", Role.ROLE_PM);
            User engineer = new User("engineer", passwordEncoder.encode("engineer"), "Site Engineer",
                    Role.ROLE_ENGINEER);
            User viewer = new User("viewer", passwordEncoder.encode("viewer"), "Client Viewer", Role.ROLE_VIEWER);
            userRepository.save(admin);
            userRepository.save(pm);
            userRepository.save(engineer);
            userRepository.save(viewer);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContext securityContext = SecurityContextHolder.getContext();
            securityContext.setAuthentication(authentication);

            HttpSession session = request.getSession(true);
            session.setAttribute("SPRING_SECURITY_CONTEXT", securityContext);

            User user = userRepository.findByUsername(loginRequest.getUsername()).orElseThrow();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("username", user.getUsername());
            response.put("role", user.getRole());
            response.put("name", user.getName());
            response.put("userId", user.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not found"));
        }
        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("role", user.getRole());
        response.put("name", user.getName());
        response.put("userId", user.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/reset")
    @Transactional
    public ResponseEntity<?> resetDatabase() {
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE activity_logs").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE sub_tasks").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE tasks").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE milestones").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE projects").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE users").executeUpdate();
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();

        User admin = new User("admin", passwordEncoder.encode("admin"), "System Administrator", Role.ROLE_ADMIN);
        User pm = new User("pm", passwordEncoder.encode("pm"), "Project Manager", Role.ROLE_PM);
        User engineer = new User("engineer", passwordEncoder.encode("engineer"), "Site Engineer", Role.ROLE_ENGINEER);
        User viewer = new User("viewer", passwordEncoder.encode("viewer"), "Client Viewer", Role.ROLE_VIEWER);
        userRepository.save(admin);
        userRepository.save(pm);
        userRepository.save(engineer);
        userRepository.save(viewer);

        return ResponseEntity.ok(Map.of("message", "Database hard reset successfully. Valid passwords generated."));
    }

    @GetMapping("/seed")
    @Transactional
    public ResponseEntity<?> seedDummyData() {
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE sub_tasks").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE tasks").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE milestones").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE equipments").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE labor_force").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE materials").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE issues").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE TABLE projects").executeUpdate();
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO projects (name, location, client, start_date, end_date, budget, status, completion_percentage) VALUES ('Downtown Metro Tower', 'Mumbai', 'Metro Corp', '2026-03-01', '2027-12-30', 50000000.0, 'ONGOING', 15.0), ('Riverside Bridge', 'Delhi', 'NHAI', '2026-01-15', '2026-10-30', 12000000.0, 'ONGOING', 45.0)")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO milestones (project_id, name, due_date, status) VALUES (1, 'Foundation Check', '2026-05-15', 'PENDING'), (1, 'Structure Complete', '2027-01-10', 'PENDING'), (2, 'Pillars Complete', '2026-04-20', 'COMPLETED')")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO tasks (project_id, name, engineer_id, start_date, deadline, estimated_cost, actual_cost, progress, status) VALUES (1, 'Excavation & Shoring', 3, '2026-03-01', '2026-04-15', 2500000.0, 1500000.0, 60, 'IN_PROGRESS'), (2, 'Concrete Pouring', 3, '2026-02-01', '2026-04-05', 4000000.0, 3800000.0, 90, 'IN_PROGRESS')")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO sub_tasks (task_id, name, progress, status) VALUES (1, 'Site Clearance', 100, 'COMPLETED'), (1, 'Soil Testing', 100, 'COMPLETED'), (1, 'Digging', 40, 'IN_PROGRESS'), (2, 'Mix Preparation', 100, 'COMPLETED')")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO equipments (project_id, name, total_quantity, in_use, in_maintenance) VALUES (1, 'Excavator', 4, 3, 1), (1, 'Concrete Mixer', 2, 1, 0), (2, 'Crane', 2, 2, 0)")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO labor_force (project_id, worker_type, count, daily_wage, days_worked, total_paid) VALUES (1, 'ENGINEER', 5, 2000.0, 15, 100000.0), (1, 'MASON', 20, 800.0, 15, 200000.0), (1, 'HELPER', 40, 500.0, 15, 250000.0), (2, 'OPERATOR', 10, 1200.0, 10, 120000.0)")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO materials (project_id, name, total_available, daily_consumption_rate, refill_date_target) VALUES (1, 'Cement (Bags)', 5000.0, 200.0, '2026-03-25'), (1, 'Steel (Tons)', 200.0, 5.0, '2026-04-10'), (2, 'Sand (Cubic Meters)', 1500.0, 50.0, '2026-03-30')")
                .executeUpdate();

        entityManager.createNativeQuery(
                "INSERT INTO issues (project_id, title, description, category, severity, status, reported_by, created_at) VALUES (1, 'Crane Breakdown', 'Main crane engine failure.', 'EQUIPMENT_FAILURE', 'CRITICAL', 'OPEN', 'engineer', '2026-03-10'), (1, 'Late Cement Delivery', 'Supplier delayed cement bags by 2 days.', 'MATERIAL_SHORTAGE', 'MEDIUM', 'IN_PROGRESS', 'engineer', '2026-03-12'), (2, 'Minor Flood near pier', 'River water level rose.', 'SAFETY', 'HIGH', 'OPEN', 'engineer', '2026-02-20')")
                .executeUpdate();

        return ResponseEntity
                .ok(Map.of("message",
                        "Dummy projects, milestones, tasks, sub-tasks, resources, and issues seeded successfully!"));
    }
}
