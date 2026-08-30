package com.shiftsync.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;

@Configuration
@Slf4j
public class FirebaseConfig {
    
    public FirebaseConfig() {
        System.out.println("==================== FirebaseConfig bean created! ====================");
    }

    @Value("${firebase.config.path}")
    private Resource firebaseConfigResource;

    @PostConstruct
    public void initialize() {
        System.out.println("==================== initialize() called! ====================");
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                System.out.println("==================== getApps is empty! ====================");
                if (firebaseConfigResource != null && firebaseConfigResource.exists()) {
                    System.out.println("==================== firebaseConfigResource EXISTS! ====================");
                    InputStream serviceAccount = firebaseConfigResource.getInputStream();
                    
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();

                    FirebaseApp.initializeApp(options);
                    log.info("Firebase application initialized successfully");
                } else {
                    System.out.println("==================== firebaseConfigResource DOES NOT EXIST! ====================");
                    log.warn("Firebase configuration file not found at path specified. Firebase not initialized.");
                    // For MVP/testing, if file is missing, we just log a warning instead of crashing the whole app.
                }
            } else {
                System.out.println("==================== getApps is NOT empty! ====================");
            }
        } catch (Exception e) {
            System.out.println("==================== EXCEPTION! ====================");
            e.printStackTrace();
            log.error("Failed to initialize Firebase App", e);
        }
    }
}
