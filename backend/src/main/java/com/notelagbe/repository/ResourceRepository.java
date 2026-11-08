package com.notelagbe.repository;

import com.notelagbe.entity.Resource;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByCourseIdAndStatus(Long courseId, ResourceStatus status);
    List<Resource> findByCourseId(Long courseId);
    List<Resource> findByTeacherId(Long teacherId);
    List<Resource> findByCourseCodeIgnoreCaseAndStatus(String code, ResourceStatus status);
    List<Resource> findByCourseIdAndTypeAndStatus(Long courseId, ResourceType type, ResourceStatus status);
    List<Resource> findByTeacherIdAndStatus(Long teacherId, ResourceStatus status);
    List<Resource> findByCourseIdAndTeacherIdAndStatus(Long courseId, Long teacherId, ResourceStatus status);
    List<Resource> findByCourseCodeIgnoreCaseAndTeacherIdAndStatus(String code, Long teacherId, ResourceStatus status);
    boolean existsByCourseCodeIgnoreCaseAndTeacherIdAndStatus(String code, Long teacherId, ResourceStatus status);
    List<Resource> findByStatusOrderByCreatedAtDesc(ResourceStatus status);
    List<Resource> findByUploaderIdOrderByCreatedAtDesc(Long uploaderId);
    List<Resource> findAllByOrderByCreatedAtDesc();
    boolean existsByCourseIdAndTypeAndStatus(Long courseId, ResourceType type, ResourceStatus status);
}
