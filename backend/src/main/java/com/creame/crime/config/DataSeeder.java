package com.creame.crime.config;

import com.creame.crime.model.User;
import com.creame.crime.model.UserRole;
import com.creame.crime.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public DataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AppProperties appProperties
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    public void run(String... args) {
        String adminEmail = appProperties.getBootstrap().getAdminEmail().trim().toLowerCase();
        User existing = userRepository.findByEmail(adminEmail).orElse(null);
        if (existing != null) {
            if (existing.getRole() != UserRole.ADMIN && existing.getRole() != UserRole.POLICE) {
                existing.setName(appProperties.getBootstrap().getAdminName().trim());
                existing.setPassword(passwordEncoder.encode(appProperties.getBootstrap().getAdminPassword()));
                existing.setRole(UserRole.ADMIN);
                userRepository.save(existing);
                LOGGER.warn("Upgraded reserved admin account {} to ADMIN role", adminEmail);
            }
            return;
        }

        User admin = new User();
        admin.setId(UUID.randomUUID().toString());
        admin.setName(appProperties.getBootstrap().getAdminName().trim());
        admin.setEmail(adminEmail);
        admin.setPassword(passwordEncoder.encode(appProperties.getBootstrap().getAdminPassword()));
        admin.setRole(UserRole.ADMIN);
        admin.setCreatedAt(Instant.now());
        userRepository.save(admin);

        LOGGER.info("Bootstrapped admin account for {}", adminEmail);
    }
}
