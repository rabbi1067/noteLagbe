package com.notelagbe.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.filter.ShallowEtagHeaderFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
        String uriStr = uploadDir.toUri().toString();
        if (!uriStr.endsWith("/")) {
            uriStr += "/";
        }

        // Cache uploaded documents and assets for 7 days in browser cache
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uriStr)
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
    }

    /**
     * Shallow ETag Header Filter generates MD5 hashes of HTTP responses.
     * When clients send If-None-Match, server returns 304 Not Modified without resending payload,
     * drastically reducing mobile data usage and accelerating client response times.
     */
    @Bean
    public ShallowEtagHeaderFilter shallowEtagHeaderFilter() {
        return new ShallowEtagHeaderFilter();
    }
}
