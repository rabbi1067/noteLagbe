package com.notelagbe.service.review.impl;

import com.notelagbe.dto.ReviewSubmitRequest;
import com.notelagbe.entity.Course;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.UserCourseReviewRepository;
import com.notelagbe.service.review.ReviewEligibilityValidator;
import org.springframework.stereotype.Component;

/**
 * Single Responsibility & Liskov Substitution Principle:
 * Enforces the rule: Exactly one review per student per course.
 */
@Component
public class OneReviewPerCourseValidator implements ReviewEligibilityValidator {

    private final UserCourseReviewRepository userCourseReviewRepository;

    public OneReviewPerCourseValidator(UserCourseReviewRepository userCourseReviewRepository) {
        this.userCourseReviewRepository = userCourseReviewRepository;
    }

    @Override
    public void validateEligibility(User user, Course course, ReviewSubmitRequest request) {
        if (user == null) {
            throw new ApiException("Authentication required to submit an evaluation.");
        }
        if (course == null) {
            throw new ApiException("Invalid course specified.");
        }
        if (!isEligible(user, course)) {
            throw new ApiException("You have already submitted an evaluation for course " + course.getCode() + ". Only one review per course is allowed.");
        }
    }

    @Override
    public boolean isEligible(User user, Course course) {
        if (user == null || course == null) return false;
        return !userCourseReviewRepository.existsByUserIdAndCourseId(user.getId(), course.getId());
    }
}
