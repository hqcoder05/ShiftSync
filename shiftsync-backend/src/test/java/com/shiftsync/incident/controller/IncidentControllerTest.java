package com.shiftsync.incident.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.incident.entity.*;
import com.shiftsync.incident.service.IncidentService;
import com.shiftsync.shared.exception.GlobalExceptionHandler;
import com.shiftsync.shared.security.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class IncidentControllerTest {
    IncidentService service = mock(IncidentService.class);
    MockMvc mvc;
    UUID storeId = UUID.randomUUID(), userId = UUID.randomUUID(), requestId = UUID.randomUUID();
    @BeforeEach void setup() {
        CustomUserDetails principal = new CustomUserDetails(User.builder().id(userId).systemRole(SystemRole.STAFF).build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        mvc = MockMvcBuilders.standaloneSetup(new IncidentController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).setControllerAdvice(new GlobalExceptionHandler()).build();
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void multipartBindsEnumSeverityIdempotencyKeyAndPhoto() throws Exception {
        byte[] data = {1, 2, 3};
        mvc.perform(multipart("/api/stores/{storeId}/incidents", storeId)
                .file(new MockMultipartFile("photos", "photo.jpg", "image/jpeg", data))
                .param("category", "EQUIPMENT").param("severity", "HIGH").param("description", "Máy pha đang bị hỏng")
                .param("clientRequestId", requestId.toString())).andExpect(status().isCreated());
        verify(service).create(eq(storeId), eq(userId), eq(IncidentCategory.EQUIPMENT), eq(IncidentSeverity.HIGH),
                eq("Máy pha đang bị hỏng"), eq(requestId), isNull(), argThat(files -> files.size() == 1 && files.getFirst().getSize() == data.length));
    }
    @Test void missingIdempotencyKeyIsRejectedBeforeService() throws Exception {
        mvc.perform(multipart("/api/stores/{storeId}/incidents", storeId)
                .param("category", "OTHER").param("description", "Có vấn đề trong ca làm")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void photoUsesAuthenticatedServiceAndPrivateHeaders() throws Exception {
        UUID reportId = UUID.randomUUID(), photoId = UUID.randomUUID(); byte[] data = {1, 2, 3};
        when(service.photo(storeId, userId, reportId, photoId)).thenReturn(IncidentPhoto.builder()
                .id(photoId).incidentId(reportId).contentType("image/jpeg").sizeBytes(data.length).data(data).build());
        mvc.perform(get("/api/stores/{storeId}/incidents/{id}/photos/{photoId}", storeId, reportId, photoId))
                .andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"))
                .andExpect(header().string("Cache-Control", "no-store")).andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(data));
        verify(service).photo(storeId, userId, reportId, photoId);
    }
}
