package com.shiftsync.messaging.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/** Real HTTP, authenticated SSE and two independently authenticated staff sessions. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "server.shutdown=immediate")
@org.springframework.test.context.ActiveProfiles("test")
@EnabledIfSystemProperty(named = "shiftsync.integration.database", matches = "true")
class MessagingRealtimeHttpTest {
    @LocalServerPort int port;
    @Autowired JdbcTemplate db;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Test void sendsCommittedMessageToBothSessionsAndProtectsConversation() throws Exception {
        UUID store = UUID.randomUUID(), contract = UUID.randomUUID(), first = UUID.randomUUID(), second = UUID.randomUUID(), outsider = UUID.randomUUID();
        String suffix = UUID.randomUUID().toString();
        String firstEmail = "first-" + suffix + "@example.invalid", secondEmail = "second-" + suffix + "@example.invalid", outsiderEmail = "other-" + suffix + "@example.invalid";
        String password = "Test-password-123!";
        db.update("INSERT INTO store(id,name) VALUES (?,?)", store, "Realtime test");
        db.update("INSERT INTO contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) VALUES (?,?,?,40,1,1)", contract, store, "Test");
        for (var entry : Map.of(first, firstEmail, second, secondEmail, outsider, outsiderEmail).entrySet()) {
            db.update("INSERT INTO staff(id,full_name,email,password_hash) VALUES (?,?,?,?)", entry.getKey(), "Realtime test", entry.getValue(), passwords.encode(password));
            db.update("INSERT INTO employment(id,staff_id,store_id,contract_type_id,hourly_rate,joined_date) VALUES (?,?,?,?,1,CURRENT_DATE)", UUID.randomUUID(), entry.getKey(), store, contract);
        }
        String a = login(firstEmail, password), b = login(secondEmail, password), c = login(outsiderEmail, password);
        String base = "/api/stores/" + store + "/messaging";
        var thread = post(base + "/threads", a, Map.of("recipientId", second)).body();
        String threadId = json.readTree(thread).path("id").asText();
        assertFalse(threadId.isBlank(), thread);

        var streamA = stream(a); var streamB = stream(b); var streamC = stream(c);
        try (var ra = new BufferedReader(new InputStreamReader(streamA.body()));
             var rb = new BufferedReader(new InputStreamReader(streamB.body()));
             var rc = new BufferedReader(new InputStreamReader(streamC.body()))) {
            assertEquals("event:connect", ra.readLine());
            assertEquals("event:connect", rb.readLine());
            assertEquals("event:connect", rc.readLine());
            var readA = nextMessaging(ra); var readB = nextMessaging(rb);
            var sent = post(base + "/threads/" + threadId + "/messages", a,
                    Map.of("clientMessageId", UUID.randomUUID(), "content", "Tin nhắn kiểm thử"));
            assertEquals(200, sent.statusCode(), sent.body());
            assertTrue(readA.get(10, TimeUnit.SECONDS).contains(threadId));
            assertTrue(readB.get(10, TimeUnit.SECONDS).contains(threadId));
            assertEquals(404, get(base + "/threads/" + threadId + "/messages", c).statusCode());
            assertEquals(1, json.readTree(get(base + "/threads/" + threadId + "/messages", b).body()).path("messages").size());
        }
    }

    private CompletableFuture<String> nextMessaging(BufferedReader reader) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.equals("event:messaging")) return reader.readLine();
                }
                throw new IllegalStateException("SSE closed before messaging event");
            } catch (Exception e) { throw new RuntimeException(e); }
        });
    }
    private String login(String email, String password) throws Exception {
        var response = post("/api/auth/login", null, Map.of("email", email, "password", password));
        assertEquals(200, response.statusCode(), response.body());
        return json.readTree(response.body()).path("accessToken").asText();
    }
    private HttpResponse<java.io.InputStream> stream(String token) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/users/me/notifications/stream")).header("Authorization", "Bearer " + token).GET().build();
        var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
        assertEquals(200, response.statusCode());
        return response;
    }
    private HttpResponse<String> post(String path, String token, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> get(String path, String token) throws Exception {
        return http.send(HttpRequest.newBuilder(uri(path)).header("Authorization", "Bearer " + token).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private URI uri(String path) { return URI.create("http://127.0.0.1:" + port + path); }
}
