package com.notelagbe.service.review;

import com.notelagbe.dto.ReviewSubmitRequest;
import com.notelagbe.entity.Course;
import com.notelagbe.entity.User;

/**
 * Single Responsibility & Open/Closed Principle:
 * Contract for validating review submission eligibility.
 * Open to new validation rules (e.g. course enrollment checks, rate-limiting)
 * without modifying submission orchestration.
 */
public interface ReviewEligibilityValidator {

    void validateEligibility(User user, Course course, ReviewSubmitRequest request);

    boolean isEligible(User user, Course course);
}
