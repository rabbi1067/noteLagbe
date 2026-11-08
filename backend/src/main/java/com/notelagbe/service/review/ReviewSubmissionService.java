package com.notelagbe.service.review;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.dto.ReviewSubmitRequest;
import com.notelagbe.entity.User;

/**
 * Interface Segregation Principle (ISP):
 * Contract for student review submission and evaluation eligibility checking.
 */
public interface ReviewSubmissionService {

    ReviewResponseDto submitReview(ReviewSubmitRequest request, User user);

    boolean hasUserReviewedCourse(User user, String courseCode);
}
