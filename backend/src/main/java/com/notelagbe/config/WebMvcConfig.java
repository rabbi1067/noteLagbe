package com.notelagbe.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.filter.ShallowEtagHeaderFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;

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

        // Serve public user-generated assets (avatars, chat media, faculty photos) with 7-day caching.
        // Protected academic materials under /uploads/materials/** MUST be streamed exclusively via /api/resources/{id}/file.
        Path avatarsDir = uploadDir.resolve("avatars").normalize();
        Path voiceDir = uploadDir.resolve("voice").normalize();
        Path chatImagesDir = uploadDir.resolve("chat_images").normalize();
        Path facultyDir = uploadDir.resolve("faculty").normalize();

        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations(ensureTrailingSlash(avatarsDir.toUri().toString()))
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
        registry.addResourceHandler("/uploads/voice/**")
                .addResourceLocations(ensureTrailingSlash(voiceDir.toUri().toString()))
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
        registry.addResourceHandler("/uploads/chat_images/**")
                .addResourceLocations(ensureTrailingSlash(chatImagesDir.toUri().toString()))
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
        registry.addResourceHandler("/uploads/faculty/**")
                .addResourceLocations(ensureTrailingSlash(facultyDir.toUri().toString()))
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
    }

    private String ensureTrailingSlash(String uriStr) {
        return uriStr.endsWith("/") ? uriStr : uriStr + "/";
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

    /**
     * Prevents MIME-sniffing and script execution for static files served under /uploads/**.
     */
    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> uploadsSecurityHeadersFilter() {
        FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain
            ) throws ServletException, IOException {
                response.setHeader("X-Content-Type-Options", "nosniff");
                response.setHeader("Content-Security-Policy", "sandbox");
                filterChain.doFilter(request, response);
            }
        });
        registration.addUrlPatterns("/uploads/*");
        return registration;
    }
}
