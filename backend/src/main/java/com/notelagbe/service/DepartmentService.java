package com.notelagbe.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.dto.DepartmentResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DepartmentService {

    private static final Logger log = LoggerFactory.getLogger(DepartmentService.class);
    private static final String SEU_PROGRAMS_URL = "https://seu.edu.bd/programs";
    private static final long CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private List<DepartmentResponseDto> cachedDepartments = new ArrayList<>();
    private long lastFetchTimestamp = 0;
    private String lastSource = "init";

    // Static metadata definition for the 11 official departments of Southeast University
    private static final Map<String, DeptMeta> OFFICIAL_DEPT_META = new LinkedHashMap<>();

    private static class DeptMeta {
        String code;
        String name;
        String nameBn;
        String faculty;
        String facultyBn;

        DeptMeta(String code, String name, String nameBn, String faculty, String facultyBn) {
            this.code = code;
            this.name = name;
            this.nameBn = nameBn;
            this.faculty = faculty;
            this.facultyBn = facultyBn;
        }
    }

    static {
        OFFICIAL_DEPT_META.put("CSE", new DeptMeta("CSE", "Department of Computer Science & Engineering", "কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিভাগ", "School of Engineering (SE)", "স্কুল অফ ইঞ্জিনিয়ারিং"));
        OFFICIAL_DEPT_META.put("EEE", new DeptMeta("EEE", "Department of Electrical & Electronic Engineering", "ইলেকট্রিক্যাল অ্যান্ড ইলেকট্রনিক ইঞ্জিনিয়ারিং বিভাগ", "School of Engineering (SE)", "স্কুল অফ ইঞ্জিনিয়ারিং"));
        OFFICIAL_DEPT_META.put("ARCH", new DeptMeta("ARCH", "Department of Architecture", "স্থাপত্য বিভাগ (আর্কিটেকচার)", "School of Engineering (SE)", "স্কুল অফ ইঞ্জিনিয়ারিং"));
        OFFICIAL_DEPT_META.put("TEX", new DeptMeta("TEX", "Department of Textile Engineering", "টেক্সটাইল ইঞ্জিনিয়ারিং বিভাগ", "School of Engineering (SE)", "স্কুল অফ ইঞ্জিনিয়ারিং"));
        OFFICIAL_DEPT_META.put("PHR", new DeptMeta("PHR", "Department of Pharmacy", "ফার্মেসি বিভাগ", "School of Science (SS)", "স্কুল অফ সায়েন্স"));
        OFFICIAL_DEPT_META.put("BBA", new DeptMeta("BBA", "Southeast Business School", "সাউথইস্ট বিজনেস স্কুল", "School of Business Studies (SBS)", "স্কুল অফ বিজনেস স্টাডিজ"));
        OFFICIAL_DEPT_META.put("LAW", new DeptMeta("LAW", "Department of Law & Justice", "আইন ও বিচার বিভাগ", "School of Law (SL)", "স্কুল অফ ল"));
        OFFICIAL_DEPT_META.put("ENG", new DeptMeta("ENG", "Department of English", "ইংরেজি বিভাগ", "School of Arts & Social Sciences (SASS)", "স্কুল অফ আর্টস অ্যান্ড সোশ্যাল সায়েন্সেস"));
        OFFICIAL_DEPT_META.put("BNG", new DeptMeta("BNG", "Department of Bangla", "বাংলা বিভাগ", "School of Arts & Social Sciences (SASS)", "স্কুল অফ আর্টস অ্যান্ড সোশ্যাল সায়েন্সেস"));
        OFFICIAL_DEPT_META.put("ECO", new DeptMeta("ECO", "Department of Economics", "অর্থনীতি বিভাগ", "School of Arts & Social Sciences (SASS)", "স্কুল অফ আর্টস অ্যান্ড সোশ্যাল সায়েন্সেস"));
        OFFICIAL_DEPT_META.put("ICT", new DeptMeta("ICT", "Department of Information & Communication Technology", "ইনফরমেশন অ্যান্ড কমিউনিকেশন টেকনোলজি বিভাগ", "School of Information Technology (SIT)", "স্কুল অফ ইনফরমেশন টেকনোলজি"));
    }

    public DepartmentService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    public synchronized List<DepartmentResponseDto> getDepartments(boolean forceRefresh) {
        long now = System.currentTimeMillis();
        if (!forceRefresh && !cachedDepartments.isEmpty() && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
            return new ArrayList<>(cachedDepartments);
        }

        try {
            List<DepartmentResponseDto> liveList = fetchAndParseFromSeu();
            if (liveList != null && !liveList.isEmpty()) {
                this.cachedDepartments = liveList;
                this.lastFetchTimestamp = now;
                this.lastSource = "live_sync_seu_website";
                log.info("Successfully synced {} official departments directly from seu.edu.bd/programs", liveList.size());
                return new ArrayList<>(cachedDepartments);
            }
        } catch (Exception e) {
            log.warn("Could not fetch live departments from {}: {}. Using verified official fallback.", SEU_PROGRAMS_URL, e.getMessage());
        }

        if (cachedDepartments.isEmpty()) {
            this.cachedDepartments = getVerifiedFallbackDepartments();
            this.lastFetchTimestamp = now;
            this.lastSource = "verified_official_fallback";
        }
        return new ArrayList<>(cachedDepartments);
    }

    public String getLastSource() {
        return lastSource;
    }

    private List<DepartmentResponseDto> fetchAndParseFromSeu() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(SEU_PROGRAMS_URL))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("SEU returned HTTP status " + response.statusCode());
        }

        String html = response.body();
        Pattern pattern = Pattern.compile("data-page=([\"'])(.*?)\\1", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(html);
        if (!matcher.find()) {
            throw new IllegalStateException("data-page attribute not found in HTML response");
        }

        String rawJson = matcher.group(2)
                .replace("&quot;", "\"")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&#039;", "'");

        JsonNode root = objectMapper.readTree(rawJson);
        JsonNode sections = root.path("props").path("sections");

        Map<String, List<String>> deptProgramsMap = new LinkedHashMap<>();
        for (String code : OFFICIAL_DEPT_META.keySet()) {
            deptProgramsMap.put(code, new ArrayList<>());
        }

        for (JsonNode sec : sections) {
            JsonNode items = sec.path("contents").path("module_contents").path("module_items");
            if (items.isArray()) {
                for (JsonNode it : items) {
                    String title = it.path("content").path("title").asText("");
                    String school = it.path("category").path("name").asText("");
                    String code = matchDeptCode(title, school);
                    if (code != null) {
                        deptProgramsMap.computeIfAbsent(code, k -> new ArrayList<>()).add(title.trim());
                    }
                }
            }
        }

        List<DepartmentResponseDto> result = new ArrayList<>();
        for (Map.Entry<String, DeptMeta> entry : OFFICIAL_DEPT_META.entrySet()) {
            String code = entry.getKey();
            DeptMeta meta = entry.getValue();
            List<String> progs = deptProgramsMap.getOrDefault(code, Collections.emptyList());

            boolean isCse = "CSE".equalsIgnoreCase(code);
            String status = isCse ? "active" : "coming_soon";
            String notesStatus = isCse ? "active" : "coming_soon";
            String teachersStatus = isCse ? "active" : "coming_soon";

            result.add(new DepartmentResponseDto(
                    code.toLowerCase(),
                    code,
                    meta.name,
                    meta.nameBn,
                    meta.faculty,
                    meta.facultyBn,
                    isCse,
                    status,
                    notesStatus,
                    teachersStatus,
                    progs
            ));
        }

        return result;
    }

    private String matchDeptCode(String title, String school) {
        String t = (title != null ? title.toLowerCase() : "");
        String s = (school != null ? school.toLowerCase() : "");

        if (t.contains("cse") || t.contains("computer science")) return "CSE";
        if (t.contains("eee") || t.contains("electrical")) return "EEE";
        if (t.contains("architecture") || t.contains("barch")) return "ARCH";
        if (t.contains("textile")) return "TEX";
        if (t.contains("pharm")) return "PHR";
        if (t.contains("business") || t.contains("bba") || t.contains("mba")) return "BBA";
        if (t.contains("law") || t.contains("llb") || t.contains("llm")) return "LAW";
        if (t.contains("english")) return "ENG";
        if (t.contains("bangla")) return "BNG";
        if (t.contains("economics") || t.contains("development studies") || t.contains("mds")) return "ECO";
        if (t.contains("information & communication") || t.contains("ict")) return "ICT";

        return null;
    }

    private List<DepartmentResponseDto> getVerifiedFallbackDepartments() {
        List<DepartmentResponseDto> list = new ArrayList<>();

        Map<String, List<String>> verifiedPrograms = new HashMap<>();
        verifiedPrograms.put("ARCH", List.of("Bachelor of Architecture"));
        verifiedPrograms.put("CSE", List.of("BSc in CSE"));
        verifiedPrograms.put("EEE", List.of("BSc in EEE"));
        verifiedPrograms.put("PHR", List.of("B. Pharm (Hons)"));
        verifiedPrograms.put("TEX", List.of("BSc in Textile Engineering"));
        verifiedPrograms.put("BBA", List.of("Bachelor of Business Administration", "Master of Business Administration (1 Year)", "Master of Business Administration (Executive)", "Master of Business Administration (Friday)", "Master of Business Administration (Regular)"));
        verifiedPrograms.put("ECO", List.of("BSS (Hons) in Economics", "Master in Development Studies (MDS)"));
        verifiedPrograms.put("ENG", List.of("BA (Hons) in English", "MA in English"));
        verifiedPrograms.put("LAW", List.of("LLB Hons", "LLM (Final)"));
        verifiedPrograms.put("BNG", List.of("BA (Hons) in Bangla", "Master of Arts in Bangla"));
        verifiedPrograms.put("ICT", List.of("Department of Information & Communication Technology"));

        for (Map.Entry<String, DeptMeta> entry : OFFICIAL_DEPT_META.entrySet()) {
            String code = entry.getKey();
            DeptMeta meta = entry.getValue();
            boolean isCse = "CSE".equalsIgnoreCase(code);
            list.add(new DepartmentResponseDto(
                    code.toLowerCase(),
                    code,
                    meta.name,
                    meta.nameBn,
                    meta.faculty,
                    meta.facultyBn,
                    isCse,
                    isCse ? "active" : "coming_soon",
                    isCse ? "active" : "coming_soon",
                    isCse ? "active" : "coming_soon",
                    verifiedPrograms.getOrDefault(code, Collections.emptyList())
            ));
        }

        return list;
    }
}
