package com.shiftsync;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class MyHashTest {
    @Test
    public void testHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = "$2a$10$8.UnVuG9UHcI4JQWp8W.1eT76X/95J8sC5sT6F/M5x.R6k1t4t2hW";
        System.out.println("Matches 'password': " + encoder.matches("password", hash));
        System.out.println("Matches 'password123': " + encoder.matches("password123", hash));
        System.out.println("Matches 'password1234': " + encoder.matches("password1234", hash));
        System.out.println("Matches '123456': " + encoder.matches("123456", hash));
        System.out.println("Matches '12345678': " + encoder.matches("12345678", hash));
        System.out.println("Matches 'admin': " + encoder.matches("admin", hash));
    }
}
