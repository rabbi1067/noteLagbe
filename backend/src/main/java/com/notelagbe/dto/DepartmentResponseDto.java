package com.notelagbe.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class DepartmentResponseDto {
    private String id;
    private String code;
    private String name;
    private String nameBn;
    private String faculty;
    private String facultyBn;

    @JsonProperty("isLive")
    private boolean isLive; // Strictly true ONLY for CSE

    private String status;  // "active" for CSE, "coming_soon" for others
    private String notesStatus;
    private String teachersStatus;
    private List<String> programs;

    public DepartmentResponseDto() {}

    public DepartmentResponseDto(String id, String code, String name, String nameBn, String faculty, String facultyBn,
                                 boolean isLive, String status, String notesStatus, String teachersStatus, List<String> programs) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.nameBn = nameBn;
        this.faculty = faculty;
        this.facultyBn = facultyBn;
        this.isLive = isLive;
        this.status = status;
        this.notesStatus = notesStatus;
        this.teachersStatus = teachersStatus;
        this.programs = programs;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNameBn() { return nameBn; }
    public void setNameBn(String nameBn) { this.nameBn = nameBn; }

    public String getFaculty() { return faculty; }
    public void setFaculty(String faculty) { this.faculty = faculty; }

    public String getFacultyBn() { return facultyBn; }
    public void setFacultyBn(String facultyBn) { this.facultyBn = facultyBn; }

    @JsonProperty("isLive")
    public boolean isLive() { return isLive; }

    @JsonProperty("isLive")
    public void setLive(boolean live) { isLive = live; }

    @JsonProperty("live")
    public boolean getLive() { return isLive; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotesStatus() { return notesStatus; }
    public void setNotesStatus(String notesStatus) { this.notesStatus = notesStatus; }

    public String getTeachersStatus() { return teachersStatus; }
    public void setTeachersStatus(String teachersStatus) { this.teachersStatus = teachersStatus; }

    public List<String> getPrograms() { return programs; }
    public void setPrograms(List<String> programs) { this.programs = programs; }
}
