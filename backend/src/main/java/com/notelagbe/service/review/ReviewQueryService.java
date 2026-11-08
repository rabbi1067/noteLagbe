package com.notelagbe.service.review;

import com.notelagbe.dto.ReviewResponseDto;
import java.util.List;

/**
 * Interface Segregation Principle (ISP):
 * Read-only query contract for retrieving public approved reviews.
 */
public interface ReviewQueryService {

    List<ReviewResponseDto> getApprovedReviewsForCourse(String courseCode);

    List<ReviewResponseDto> getApprovedReviewsForTeacher(Long teacherId);

    List<ReviewResponseDto> getRecentApprovedReviews();
}
