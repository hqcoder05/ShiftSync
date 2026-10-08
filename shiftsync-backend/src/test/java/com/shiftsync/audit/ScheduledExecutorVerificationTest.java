package com.shiftsync.audit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.test.context.ActiveProfiles;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ScheduledExecutorVerificationTest {
    @Autowired
    @Qualifier("taskScheduler")
    private ThreadPoolTaskScheduler taskScheduler;

    @Test
    public void testTaskSchedulerConcurrency() throws Exception {
        assertNotNull(taskScheduler);
        assertTrue(taskScheduler.getPoolSize() >= 2);
        AtomicInteger fastTaskCount = new AtomicInteger(0);
        
        ScheduledFuture<?> slowTask = taskScheduler.scheduleWithFixedDelay(() -> {
            try { Thread.sleep(2000); } catch (Exception e) {}
        }, 100);
        
        ScheduledFuture<?> fastTask = taskScheduler.scheduleWithFixedDelay(() -> {
            fastTaskCount.incrementAndGet();
        }, 100);
        
        Thread.sleep(3000);
        slowTask.cancel(true);
        fastTask.cancel(true);
        
        assertTrue(fastTaskCount.get() > 10, "Fast task should have run many times despite slow task blocking one thread. Actual: " + fastTaskCount.get());
        System.out.println("Heartbeats executed during 3s cron block: " + fastTaskCount.get());
    }
}
