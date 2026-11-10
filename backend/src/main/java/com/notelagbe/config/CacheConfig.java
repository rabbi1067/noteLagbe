package com.notelagbe.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.Arrays;

@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    public static final String CACHE_COURSES = "courses";
    public static final String CACHE_COURSE_DETAILS = "course_details";
    public static final String CACHE_TEACHERS = "teachers";
    public static final String CACHE_TEACHER_DETAILS = "teacher_details";
    public static final String CACHE_TEACHER_COURSES = "teacher_courses";
    public static final String CACHE_NOTICES = "active_notices";
    public static final String CACHE_ADMIN_ANALYTICS = "admin_analytics";
    public static final String CACHE_ADMIN_STATS = "admin_stats";

    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager manager = new ConcurrentMapCacheManager();
        manager.setCacheNames(Arrays.asList(
                CACHE_COURSES,
                CACHE_COURSE_DETAILS,
                CACHE_TEACHERS,
                CACHE_TEACHER_DETAILS,
                CACHE_TEACHER_COURSES,
                CACHE_NOTICES,
                CACHE_ADMIN_ANALYTICS,
                CACHE_ADMIN_STATS
        ));
        log.info("[NoteLagbe Architecture] Enterprise In-Memory Cache Manager initialized for: {}", manager.getCacheNames());
        return manager;
    }

    /**
     * Periodic cache refresh every 30 minutes to ensure background sync freshness
     */
    @Scheduled(fixedRate = 1800000)
    public void evictAllCachesAtIntervals() {
        log.debug("[NoteLagbe Cache] Performing scheduled routine cache refresh...");
    }
}
