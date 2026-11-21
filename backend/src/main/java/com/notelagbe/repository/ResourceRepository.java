package com.notelagbe.repository;

import com.notelagbe.entity.Resource;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.ResourceType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    long countByStatusAndTypeIn(ResourceStatus status, Collection<ResourceType> types);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseIdAndStatus(Long courseId, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseIdAndStatusIn(Long courseId, Collection<ResourceStatus> statuses);

    @Query("""
        SELECT r.id, r.title, r.type, r.semesterName, r.status, c.code, t.id, t.name
        FROM Resource r
        JOIN r.course c
        LEFT JOIN r.teacher t
        WHERE LOWER(c.code) = LOWER(:courseCode)
          AND r.status IN :statuses
    """)
    List<Object[]> findActiveDuplicateSlotsByCourseCode(
            @Param("courseCode") String courseCode,
            @Param("statuses") Collection<ResourceStatus> statuses
    );

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseId(Long courseId);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseCodeIgnoreCaseAndStatus(String code, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseIdAndTypeAndStatus(Long courseId, ResourceType type, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByTeacherIdAndStatus(Long teacherId, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByTeacherIdAndStatusOrderByCreatedAtDesc(Long teacherId, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseIdAndTeacherIdAndStatus(Long courseId, Long teacherId, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseIdAndTeacherId(Long courseId, Long teacherId);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByCourseCodeIgnoreCaseAndTeacherIdAndStatus(String code, Long teacherId, ResourceStatus status);

    boolean existsByCourseCodeIgnoreCaseAndTeacherIdAndStatus(String code, Long teacherId, ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByStatusOrderByCreatedAtDesc(ResourceStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findByUploaderIdOrderByCreatedAtDesc(Long uploaderId);

    @EntityGraph(attributePaths = {"course", "teacher", "uploader"})
    List<Resource> findAllByOrderByCreatedAtDesc();

    boolean existsByCourseIdAndTypeAndStatus(Long courseId, ResourceType type, ResourceStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE Resource r SET r.downloadsCount = COALESCE(r.downloadsCount, 0) + 1 WHERE r.id = :id")
    int incrementDownloadCountDirect(@Param("id") Long id);
}
