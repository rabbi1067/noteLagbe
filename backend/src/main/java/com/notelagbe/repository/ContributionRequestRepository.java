package com.notelagbe.repository;

import com.notelagbe.entity.ContributionRequest;
import com.notelagbe.entity.ResourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContributionRequestRepository extends JpaRepository<ContributionRequest, Long> {
    List<ContributionRequest> findByStatusOrderByCreatedAtDesc(ResourceStatus status);
    List<ContributionRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ContributionRequest> findByUploadedResourceId(Long resourceId);
    List<ContributionRequest> findByRequestedCourse1IdOrRequestedCourse2Id(Long courseId1, Long courseId2);
    void deleteByUploadedResourceId(Long resourceId);
    void deleteByUserId(Long userId);
}
