package com.creame.crime.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URISyntaxException;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DataSourceConfig {

    @Value("${DATABASE_URL:${JDBC_DATABASE_URL:}}")
    private String databaseUrl;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            throw new IllegalStateException("DATABASE_URL or JDBC_DATABASE_URL must be set");
        }

        // Convert postgres:// URL to jdbc:postgresql:// format
        String jdbcUrl = convertToJdbcUrl(databaseUrl);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        config.setIdleTimeout(300000);
        config.setConnectionTimeout(20000);
        config.setMaxLifetime(1200000);

        return new HikariDataSource(config);
    }

    private String convertToJdbcUrl(String url) {
        if (url.startsWith("jdbc:")) {
            return url;
        }

        if (url.startsWith("postgres://")) {
            try {
                URI uri = new URI(url);
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                String query = uri.getQuery();

                StringBuilder jdbcUrl = new StringBuilder();
                jdbcUrl.append("jdbc:postgresql://")
                       .append(host)
                       .append(":").append(port)
                       .append(path);

                // Add user/password as query parameters if present
                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isEmpty()) {
                    String[] credentials = userInfo.split(":");
                    String user = credentials[0];
                    String password = credentials.length > 1 ? credentials[1] : "";

                    if (query != null) {
                        jdbcUrl.append("?").append(query).append("&");
                    } else {
                        jdbcUrl.append("?");
                    }
                    jdbcUrl.append("user=").append(user)
                           .append("&password=").append(password);
                } else if (query != null) {
                    jdbcUrl.append("?").append(query);
                }

                return jdbcUrl.toString();
            } catch (URISyntaxException e) {
                throw new IllegalArgumentException("Invalid DATABASE_URL: " + url, e);
            }
        }

        return url;
    }
}
