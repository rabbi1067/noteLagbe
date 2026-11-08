package com.notelagbe.service.review.impl;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.dto.ReviewSubmitRequest;
import com.notelagbe.entity.Course;
import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import com.notelagbe.entity.Teacher;
import com.notelagbe.entity.User;
import com.notelagbe.entity.UserCourseReview;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.ReviewRepository;
import com.notelagbe.repository.TeacherRepository;
import com.notelagbe.repository.UserCourseReviewRepository;
import com.notelagbe.service.review.ReviewAnonymityHandler;
import com.notelagbe.service.review.ReviewEligibilityValidator;
import com.notelagbe.service.review.ReviewMapper;
import com.notelagbe.service.review.ReviewSubmissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single Responsibility & Dependency Inversion Principle:
 * Orchestrates review submission, relying on injected abstractions for validation,
 * anonymity policy, mapping, and persistence.
 */
@Service
public class ReviewSubmissionServiceImpl implements ReviewSubmissionService {

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final UserCourseReviewRepository userCourseReviewRepository;
    private final ReviewEligibilityValidator eligibilityValidator;
    private final ReviewAnonymityHandler anonymityHandler;
    private final ReviewMapper reviewMapper;

    public ReviewSubmissionServiceImpl(ReviewRepository reviewRepository,
                                       CourseRepository courseRepository,
                                       TeacherRepository teacherRepository,
                                       UserCourseReviewRepository userCourseReviewRepository,
                                       ReviewEligibilityValidator eligibilityValidator,
                                       ReviewAnonymityHandler anonymityHandler,
                                       ReviewMapper reviewMapper) {
        this.reviewRepository = reviewRepository;
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.userCourseReviewRepository = userCourseReviewRepository;
        this.eligibilityValidator = eligibilityValidator;
        this.anonymityHandler = anonymityHandler;
        this.reviewMapper = reviewMapper;
    }

    @Override
    @Transactional
    public ReviewResponseDto submitReview(ReviewSubmitRequest request, User user) {
        Course course = courseRepository.findByCodeIgnoreCase(request.getCourseCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseCode()));

        // 1. Single Responsibility: Validate submission eligibility via policy
        eligibilityValidator.validateEligibility(user, course, request);

        // 2. Track evaluated course without coupling to review identity
        userCourseReviewRepository.save(new UserCourseReview(user, course));

        Teacher teacher = null;
        if (request.getTeacherId() != null) {
            teacher = teacherRepository.findById(request.getTeacherId()).orElse(null);
        }

        // 3. Assemble review entity with traits
        Review review = new Review();
        review.setCourse(course);
        review.setTeacher(teacher);
        review.setRating(request.getRating());
        review.setComment(request.getComment().trim());
        // Normalize traits for course reviews vs teacher reviews
        String defaultPersonality = teacher != null ? "Friendly" : "Mid Degree (Sem 4-6)";
        String defaultMarking = teacher != null ? "Fair & Generous" : "Moderate / Balanced";
        review.setPersonality(sanitizeTrait(request.getPersonality(), defaultPersonality));
        review.setMarking(sanitizeTrait(request.getMarking(), defaultMarking));
        review.setDifficulty(sanitizeTrait(request.getDifficulty(), "Medium"));
        // Course feedback publishes directly for peer guidance; 1 review per student per course enforced
        review.setStatus(ReviewStatus.APPROVED);

        // 4. Single Responsibility: Apply privacy & architectural anonymity policy
        anonymityHandler.applyAnonymityPolicy(review, user, request.isAnonymous());

        Review saved = reviewRepository.save(review);
        return reviewMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasUserReviewedCourse(User user, String courseCode) {
        if (user == null || courseCode == null || courseCode.isBlank()) return false;
        return courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .map(c -> !eligibilityValidator.isEligible(user, c))
                .orElse(false);
    }

    private String sanitizeTrait(String trait, String defaultVal) {
        if (trait == null || trait.isBlank()) return defaultVal;
        return trait.trim();
    }
}
