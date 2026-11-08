package com.notelagbe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.FacultyCategory;
import com.notelagbe.entity.Teacher;
import com.notelagbe.repository.TeacherRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class SeuFacultySyncService {

    private static final Logger log = LoggerFactory.getLogger(SeuFacultySyncService.class);

    private final TeacherRepository teacherRepository;
    private final LiveSyncService liveSyncService;
    private final ObjectMapper objectMapper;

    public SeuFacultySyncService(TeacherRepository teacherRepository,
                                 LiveSyncService liveSyncService,
                                 ObjectMapper objectMapper) {
        this.teacherRepository = teacherRepository;
        this.liveSyncService = liveSyncService;
        this.objectMapper = objectMapper;
    }

    @CacheEvict(value = {"teachers", "teacher_details", "courses", "course_details"}, allEntries = true)
    @Transactional
    public Map<String, Object> syncCseFaculties() {
        log.info("Starting SEU CSE Faculty Sync from official records (https://cse.seu.edu.bd/cse-faculties-staff)...");
        int updated = 0;
        int added = 0;
        int unchanged = 0;

        try {
            ClassPathResource resource = new ClassPathResource("data/seu_cse_official_scraped.json");
            if (!resource.exists()) {
                throw new IllegalStateException("SEU CSE scraped data file not found in resources");
            }

            List<Map<String, Object>> scrapedList;
            try (InputStream is = resource.getInputStream()) {
                scrapedList = objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {});
            }

            List<Teacher> existingTeachers = teacherRepository.findAll();
            Map<String, Teacher> nameMap = new HashMap<>();
            Map<String, Teacher> emailMap = new HashMap<>();

            for (Teacher t : existingTeachers) {
                if (t.getName() != null) {
                    nameMap.put(normalizeName(t.getName()), t);
                }
                if (t.getEmail() != null) {
                    String[] emails = t.getEmail().split(",");
                    for (String e : emails) {
                        String clean = e.trim().toLowerCase();
                        if (!clean.isEmpty()) emailMap.put(clean, t);
                    }
                }
            }

            for (Map<String, Object> scraped : scrapedList) {
                String name = (String) scraped.get("name");
                if (name == null || name.trim().isEmpty()) continue;

                String designation = (String) scraped.get("designation");
                String room = (String) scraped.get("room");
                String phone = (String) scraped.get("phone");
                String ext = (String) scraped.get("ext");
                String email = (String) scraped.get("email");
                String image = (String) scraped.get("image");

                // Find existing teacher by email first, then normalized name
                Teacher target = null;
                if (email != null && !email.trim().isEmpty()) {
                    for (String em : email.split(",")) {
                        String cleanEm = em.trim().toLowerCase();
                        if (emailMap.containsKey(cleanEm)) {
                            target = emailMap.get(cleanEm);
                            break;
                        }
                    }
                }

                if (target == null) {
                    String normName = normalizeName(name);
                    target = nameMap.get(normName);
                }

                if (target != null) {
                    boolean changed = false;

                    // Update image to real official photo if available
                    if (image != null && !image.trim().isEmpty() && !image.contains("avatar_blue")) {
                        if (target.getImage() == null || !target.getImage().contains("ums-local.seu.edu.bd") || target.getImage().startsWith("./") || target.getImage().contains("avatar_blue") || target.getImage().contains("flaticon")) {
                            target.setImage(image);
                            changed = true;
                        }
                    } else if (image != null && !image.trim().isEmpty() && (target.getImage() == null || target.getImage().startsWith("./"))) {
                        target.setImage(image);
                        changed = true;
                    }

                    if (room != null && !room.trim().isEmpty() && !"N/A".equalsIgnoreCase(room.trim()) && !"Main Campus".equalsIgnoreCase(room.trim()) && !Objects.equals(target.getRoom(), room)) {
                        target.setRoom(room);
                        changed = true;
                    }
                    if (designation != null && !designation.trim().isEmpty() && !Objects.equals(target.getDesignation(), designation)) {
                        target.setDesignation(designation);
                        changed = true;
                    }
                    if (phone != null && !phone.trim().isEmpty() && !"N/A".equalsIgnoreCase(phone.trim()) && !Objects.equals(target.getPhone(), phone)) {
                        target.setPhone(phone);
                        changed = true;
                    }
                    if (ext != null && !ext.trim().isEmpty() && !"N/A".equalsIgnoreCase(ext.trim()) && !Objects.equals(target.getExt(), ext)) {
                        target.setExt(ext);
                        changed = true;
                    }
                    if (email != null && !email.trim().isEmpty() && (target.getEmail() == null || target.getEmail().isEmpty())) {
                        target.setEmail(email);
                        changed = true;
                    }
                    target.setDepartment("CSE");

                    if (changed) {
                        teacherRepository.save(target);
                        updated++;
                    } else {
                        unchanged++;
                    }
                } else {
                    // Insert new teacher
                    Teacher newTeacher = new Teacher();
                    newTeacher.setName(name);
                    newTeacher.setInitial(deriveInitial(name));
                    newTeacher.setDesignation(designation != null && !designation.trim().isEmpty() ? designation : "Lecturer");
                    newTeacher.setDepartment("CSE");
                    newTeacher.setCategory(FacultyCategory.FULL_TIME_FACULTY);
                    newTeacher.setRoom(room != null && !room.trim().isEmpty() && !"N/A".equalsIgnoreCase(room) ? room : "Main Campus");
                    newTeacher.setPhone(phone != null && !"N/A".equalsIgnoreCase(phone) ? phone : "");
                    newTeacher.setExt(ext != null && !"N/A".equalsIgnoreCase(ext) ? ext : "");
                    newTeacher.setEmail(email != null ? email : "");
                    newTeacher.setImage(image != null && !image.trim().isEmpty() ? image : "https://cse.seu.edu.bd/assets/images/users/avatar_blue.png");
                    newTeacher.setOnLeave(false);

                    Teacher saved = teacherRepository.save(newTeacher);
                    nameMap.put(normalizeName(name), saved);
                    added++;
                }
            }

            liveSyncService.broadcast("teacher", "updated", "SYNC_CSE_ALL");

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "SUCCESS");
            response.put("sourceUrl", "https://cse.seu.edu.bd/cse-faculties-staff");
            response.put("department", "CSE");
            response.put("totalOfficialScraped", scrapedList.size());
            response.put("updated", updated);
            response.put("added", added);
            response.put("unchanged", unchanged);
            response.put("timestamp", LocalDateTime.now().toString());

            log.info("SEU CSE Faculty Sync finished successfully: updated={}, added={}, unchanged={}", updated, added, unchanged);
            return response;
        } catch (Exception e) {
            log.error("Failed to sync CSE faculties: {}", e.getMessage(), e);
            throw new RuntimeException("CSE Faculty sync failed: " + e.getMessage(), e);
        }
    }

    private String normalizeName(String name) {
        if (name == null) return "";
        return name.toLowerCase()
                .replaceAll("(?i)\\b(prof\\.?|dr\\.?|engr\\.?|phd|m\\.sc\\.?|b\\.sc\\.?|md\\.?|muhammad|mohammad)\\b", "")
                .replaceAll("[^a-z0-9]", "")
                .trim();
    }

    private String deriveInitial(String name) {
        if (name == null || name.trim().isEmpty()) return "CSE";
        String clean = name.replaceAll("(?i)\\b(Prof\\.?|Dr\\.?|Engr\\.?|PhD)\\b", "").trim();
        String[] parts = clean.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty() && Character.isLetter(p.charAt(0))) {
                sb.append(Character.toUpperCase(p.charAt(0)));
            }
        }
        return sb.length() >= 2 ? sb.substring(0, Math.min(sb.length(), 4)) : "FAC";
    }
}
