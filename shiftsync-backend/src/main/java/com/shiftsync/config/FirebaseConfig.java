package com.shiftsync.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import javax.annotation.PostConstruct;
import java.io.InputStream;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.config.path}")
    private Resource firebaseConfigResource;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                if (firebaseConfigResource != null && firebaseConfigResource.exists()) {
                    InputStream serviceAccount = firebaseConfigResource.getInputStream();
                    
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();

                    FirebaseApp.initializeApp(options);
                    log.info("Firebase application initialized successfully");
                } else {
                    log.warn("Firebase configuration file not found at path specified. Firebase not initialized.");
                    // For MVP/testing, if file is missing, we just log a warning instead of crashing the whole app.
                }
            }
        } catch (Exception e) {
            log.error("Failed to initialize Firebase App", e);
        }
    }
}
