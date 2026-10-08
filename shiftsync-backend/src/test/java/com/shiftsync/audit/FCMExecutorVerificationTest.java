package com.shiftsync.audit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class FCMExecutorVerificationTest {
    @Autowired
    @Qualifier("notificationExecutor")
    private ThreadPoolTaskExecutor notificationExecutor;

    @Test
    public void testNotificationExecutorRejectionAndConcurrency() throws Exception {
        assertNotNull(notificationExecutor);
        assertEquals(5, notificationExecutor.getCorePoolSize());
        assertEquals(20, notificationExecutor.getMaxPoolSize());
        
        int maxTasks = 20 + 100; // max pool + queue size
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger executedTasks = new AtomicInteger(0);
        
        boolean rejected = false;
        for (int i = 0; i < maxTasks + 50; i++) {
            try {
                notificationExecutor.execute(() -> {
                    try { latch.await(); executedTasks.incrementAndGet(); } catch (Exception e) {}
                });
            } catch (RejectedExecutionException e) {
                rejected = true;
            }
        }
        assertTrue(rejected, "Tasks exceeding MaxPool + Queue capacity should be rejected");
        System.out.println("Active Threads: " + notificationExecutor.getActiveCount());
        System.out.println("Queue Size: " + notificationExecutor.getThreadPoolExecutor().getQueue().size());
        latch.countDown();
        Thread.sleep(2000);
    }
}
