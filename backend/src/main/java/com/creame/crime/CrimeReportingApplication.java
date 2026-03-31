package com.creame.crime;

import com.creame.crime.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class CrimeReportingApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrimeReportingApplication.class, args);
    }
}
