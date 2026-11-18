package com.notelagbe.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String bengaliMessage;

    public ApiException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.bengaliMessage = null;
    }

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
        this.bengaliMessage = null;
    }

    public ApiException(String message, String bengaliMessage, HttpStatus status) {
        super(message);
        this.status = status;
        this.bengaliMessage = bengaliMessage;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getBengaliMessage() {
        return bengaliMessage;
    }
}
