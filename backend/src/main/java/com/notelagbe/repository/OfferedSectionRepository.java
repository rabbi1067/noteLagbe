package com.notelagbe.repository;

import com.notelagbe.entity.OfferedSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OfferedSectionRepository extends JpaRepository<OfferedSection, Long> {

    Optional<OfferedSection> findByCourseCodeIgnoreCaseAndSectionNumberAndSemester(
            String courseCode, String sectionNumber, String semester);

    List<OfferedSection> findBySemesterOrderByCourseCodeAscSectionNumberAsc(String semester);

    List<OfferedSection> findByCourseCodeIgnoreCaseAndSemester(String courseCode, String semester);

    @Query("SELECT DISTINCT o.courseCode FROM OfferedSection o WHERE o.semester = :semester ORDER BY o.courseCode ASC")
    List<String> findDistinctCourseCodesBySemester(@Param("semester") String semester);

    @Query("SELECT DISTINCT o.facultyInitial FROM OfferedSection o WHERE o.semester = :semester AND o.facultyInitial IS NOT NULL AND o.facultyInitial <> '' ORDER BY o.facultyInitial ASC")
    List<String> findDistinctFacultyInitialsBySemester(@Param("semester") String semester);

    @Query("SELECT DISTINCT o.semester FROM OfferedSection o ORDER BY o.semester DESC")
    List<String> findDistinctSemesters();

    @Modifying
    @Query("DELETE FROM OfferedSection o WHERE o.expiresAt IS NOT NULL AND o.expiresAt < :now")
    int deleteExpiredSections(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM OfferedSection o WHERE o.semester = :semester")
    int deleteBySemester(@Param("semester") String semester);

    @Modifying
    @Query("DELETE FROM OfferedSection o WHERE o.semester = :semester AND o.uploaderRole IN ('ADMIN', 'SYSTEM')")
    int deleteMasterSectionsBySemester(@Param("semester") String semester);

    long countBySemester(String semester);

    @Query("SELECT COUNT(o) FROM OfferedSection o WHERE o.semester = :semester AND o.uploaderRole IN ('ADMIN', 'SYSTEM')")
    long countMasterSectionsBySemester(@Param("semester") String semester);
}
