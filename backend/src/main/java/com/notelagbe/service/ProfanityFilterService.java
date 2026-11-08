package com.notelagbe.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ProfanityFilterService {

    // Comprehensive list of abusive, vulgar, and toxic words in Bengali (English alphabet & Bengali script) and English
    private static final Set<String> PROFANE_WORDS = new HashSet<>(Arrays.asList(
            // English common profanities & abuse
            "fuck", "fucker", "fucking", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "pussy",
            "motherfucker", "whore", "slut", "nigger", "faggot", "retard", "dumbass", "idiot", "scam",

            // Bengali transliterated slurs / abuse
            "khankir", "khanki", "magi", "choda", "chudi", "balsal", "balta", "bokachoda", "chodna",
            "gandu", "haramzada", "harami", "suor", "suorer", "kutta", "kuttar", "madarchod", "behenchod",
            "bhenchod", "bal", "chudirbhai", "shala", "shali", "podmarani", "randi",

            // Bengali Unicode script slurs
            "খানকি", "খানকির", "মাগী", "চোদা", "চুদি", "বাল", "বোকাচোদা", "হারামজাদা", "হারামি",
            "মাদারচোদ", "কুত্তা", "কুত্তার", "শুয়োর", "শুয়োরের", "শালা", "শালী", "রান্ডি", "গাঁড়"
    ));

    private Pattern compiledPattern;

    public ProfanityFilterService() {
        buildPattern();
    }

    private void buildPattern() {
        StringBuilder sb = new StringBuilder();
        sb.append("(?i)\\b(");
        boolean first = true;
        for (String word : PROFANE_WORDS) {
            if (!first) sb.append("|");
            sb.append(Pattern.quote(word));
            first = false;
        }
        sb.append(")\\b");
        this.compiledPattern = Pattern.compile(sb.toString(), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    /**
     * Checks if the text contains any vulgarity or profanity.
     */
    public boolean containsProfanity(String input) {
        if (input == null || input.isBlank()) return false;
        return compiledPattern.matcher(input).find();
    }

    /**
     * Replaces profanities with asterisks while preserving message meaning.
     */
    public String filterProfanity(String input) {
        if (input == null || input.isBlank()) return input;

        Matcher matcher = compiledPattern.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String match = matcher.group();
            String masked = "*".repeat(Math.max(3, match.length()));
            matcher.appendReplacement(sb, Matcher.quoteReplacement(masked));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
