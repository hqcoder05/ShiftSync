package com.shiftsync.auth;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UserGenderTest {
    @Test void missingGenderDefaultsToMale() {
        assertEquals("MALE", User.builder().build().getGender());
        assertEquals("MALE", new User().getGender());
        assertEquals("MALE", UserMapper.toDTO(User.builder().gender(null).build()).getGender());
    }
    @Test void femaleProfileSurvivesMapping() {
        assertEquals("FEMALE", UserMapper.toDTO(User.builder().gender("FEMALE").build()).getGender());
    }
}
