package com.notelagbe.dto;

import java.util.List;

public class CourseSearchResponse {
    private Long id;
    private String code;
    private String title;
    private double credits;
    private int semester;
    private boolean isLab;
    private String prerequisite;
    private String electiveGroup;
    private String department;

    private List<TeacherBriefDto> teachers;

    private boolean hasNotes;
    private boolean hasQuestions;
    private String statusBadge; // "BOTH", "NOTES_ONLY", "QUESTIONS_ONLY", "NONE"
    private int notesCount;
    private int questionsCount;

    private boolean unlocked; // True if current user has unlocked full course
    private List<Long> unlockedTeacherIds = new java.util.ArrayList<>(); // Faculty IDs unlocked via teacher-scoped gift
    private int unlockCount;
    private boolean trending;

    public CourseSearchResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public double getCredits() { return credits; }
    public void setCredits(double credits) { this.credits = credits; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public boolean isLab() { return isLab; }
    public void setLab(boolean lab) { isLab = lab; }

    public String getPrerequisite() { return prerequisite; }
    public void setPrerequisite(String prerequisite) { this.prerequisite = prerequisite; }

    public String getElectiveGroup() { return electiveGroup; }
    public void setElectiveGroup(String electiveGroup) { this.electiveGroup = electiveGroup; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public List<TeacherBriefDto> getTeachers() { return teachers; }
    public void setTeachers(List<TeacherBriefDto> teachers) { this.teachers = teachers; }

    public boolean isHasNotes() { return hasNotes; }
    public void setHasNotes(boolean hasNotes) { this.hasNotes = hasNotes; }

    public boolean isHasQuestions() { return hasQuestions; }
    public void setHasQuestions(boolean hasQuestions) { this.hasQuestions = hasQuestions; }

    public String getStatusBadge() { return statusBadge; }
    public void setStatusBadge(String statusBadge) { this.statusBadge = statusBadge; }

    public int getNotesCount() { return notesCount; }
    public void setNotesCount(int notesCount) { this.notesCount = notesCount; }

    public int getQuestionsCount() { return questionsCount; }
    public void setQuestionsCount(int questionsCount) { this.questionsCount = questionsCount; }

    public boolean isUnlocked() { return unlocked; }
    public void setUnlocked(boolean unlocked) { this.unlocked = unlocked; }

    public List<Long> getUnlockedTeacherIds() { return unlockedTeacherIds; }
    public void setUnlockedTeacherIds(List<Long> unlockedTeacherIds) { this.unlockedTeacherIds = unlockedTeacherIds; }

    public int getUnlockCount() { return unlockCount; }
    public void setUnlockCount(int unlockCount) { this.unlockCount = unlockCount; }

    public boolean isTrending() { return trending; }
    public void setTrending(boolean trending) { this.trending = trending; }
}
