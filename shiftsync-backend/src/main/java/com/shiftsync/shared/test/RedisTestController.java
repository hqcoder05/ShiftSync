package com.shiftsync.shared.test;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test/redis")
@Profile("dev")
@Hidden
public class RedisTestController {

    private final RedisTemplate<String, Object> redisTemplate;

    public RedisTestController(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/set")
    public Map<String, String> setKey(@RequestParam String key, @RequestParam String value) {
        redisTemplate.opsForValue().set(key, value);
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Key '" + key + "' set to '" + value + "'");
        return response;
    }

    @GetMapping("/get")
    public Map<String, Object> getKey(@RequestParam String key) {
        Object value = redisTemplate.opsForValue().get(key);
        Map<String, Object> response = new HashMap<>();
        response.put("key", key);
        response.put("value", value != null ? value : "Key not found");
        return response;
    }
}
