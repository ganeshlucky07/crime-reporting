package com.creame.crime.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URISyntaxException;
import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            databaseUrl = System.getenv("JDBC_DATABASE_URL");
        }

        if (databaseUrl == null || databaseUrl.isEmpty()) {
            // Fallback to local PostgreSQL for development
            databaseUrl = "jdbc:postgresql://localhost:5432/crime_reporting";
        }

        String jdbcUrl = convertToJdbcUrl(databaseUrl);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(20000);

        return new HikariDataSource(config);
    }

    private String convertToJdbcUrl(String url) {
        // If already JDBC format, return as-is
        if (url.startsWith("jdbc:")) {
            return url;
        }

        // Convert postgres:// to jdbc:postgresql://
        if (url.startsWith("postgres://")) {
            try {
                URI uri = new URI(url);
                String host = uri.getHost();
                int port = uri.getPort();
                if (port == -1) port = 5432;
                String path = uri.getPath();

                String userInfo = uri.getUserInfo();
                String user = "";
                String password = "";
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    user = parts[0];
                    password = parts[1];
                } else if (userInfo != null) {
                    user = userInfo;
                }

                StringBuilder jdbcUrl = new StringBuilder();
                jdbcUrl.append("jdbc:postgresql://").append(host).append(":").append(port).append(path);

                // Add SSL mode for Render
                jdbcUrl.append("?sslmode=require");

                if (!user.isEmpty()) {
                    jdbcUrl.append("&user=").append(user);
                }
                if (!password.isEmpty()) {
                    jdbcUrl.append("&password=").append(password);
                }

                return jdbcUrl.toString();
            } catch (URISyntaxException e) {
                throw new IllegalArgumentException("Invalid DATABASE_URL format: " + url, e);
            }
        }

        return url;
    }
}
