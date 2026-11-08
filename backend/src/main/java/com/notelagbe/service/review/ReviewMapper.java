package com.notelagbe.service.review;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.entity.Review;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Single Responsibility Principle (SRP):
 * Dedicated mapper component responsible solely for transforming
 * Review domain entities into presentation DTOs.
 */
@Component
public class ReviewMapper {

    public ReviewResponseDto toDto(Review review) {
        if (review == null) return null;
        return ReviewResponseDto.fromEntity(review);
    }

    public List<ReviewResponseDto> toDtoList(List<Review> reviews) {
        if (reviews == null || reviews.isEmpty()) {
            return Collections.emptyList();
        }
        return reviews.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}
