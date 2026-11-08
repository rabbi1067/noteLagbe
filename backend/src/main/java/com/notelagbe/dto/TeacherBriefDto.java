package com.notelagbe.dto;

public class TeacherBriefDto {
    private Long id;
    private String name;
    private String initial;
    private String designation;
    private String room;
    private String email;
    private String image;
    private String scheduleInfo;

    private boolean hasNotes = false;
    private boolean hasQuestions = false;
    private int notesCount = 0;
    private int questionsCount = 0;
    private String statusBadge = "NONE"; // "BOTH", "NOTES_ONLY", "QUESTIONS_ONLY", "NONE"

    public TeacherBriefDto() {}

    public TeacherBriefDto(Long id, String name, String initial, String designation, String room, String email, String image, String scheduleInfo) {
        this.id = id;
        this.name = name;
        this.initial = initial;
        this.designation = designation;
        this.room = room;
        this.email = email;
        this.image = image;
        this.scheduleInfo = scheduleInfo;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getInitial() { return initial; }
    public void setInitial(String initial) { this.initial = initial; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getScheduleInfo() { return scheduleInfo; }
    public void setScheduleInfo(String scheduleInfo) { this.scheduleInfo = scheduleInfo; }

    public boolean isHasNotes() { return hasNotes; }
    public void setHasNotes(boolean hasNotes) { this.hasNotes = hasNotes; }

    public boolean isHasQuestions() { return hasQuestions; }
    public void setHasQuestions(boolean hasQuestions) { this.hasQuestions = hasQuestions; }

    public int getNotesCount() { return notesCount; }
    public void setNotesCount(int notesCount) { this.notesCount = notesCount; }

    public int getQuestionsCount() { return questionsCount; }
    public void setQuestionsCount(int questionsCount) { this.questionsCount = questionsCount; }

    public String getStatusBadge() { return statusBadge; }
    public void setStatusBadge(String statusBadge) { this.statusBadge = statusBadge; }
}
