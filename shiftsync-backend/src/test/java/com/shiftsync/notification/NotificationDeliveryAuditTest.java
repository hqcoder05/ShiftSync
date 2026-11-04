package com.shiftsync.notification;

import com.shiftsync.config.AsyncConfig;
import com.shiftsync.notification.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;

/** Defect characterizations; no external messages, database or SSE transport. */
class NotificationDeliveryAuditTest {
    static class RecordingTransactions extends AbstractPlatformTransactionManager {
        int commits,rollbacks;
        @Override protected Object doGetTransaction(){return new Object();}
        @Override protected void doBegin(Object transaction,TransactionDefinition definition){}
        @Override protected void doCommit(DefaultTransactionStatus status){commits++;}
        @Override protected void doRollback(DefaultTransactionStatus status){rollbacks++;}
    }

    @Test void fullNotificationQueueDoesNotInterruptOtherAfterCommitCallbacks() throws Exception {
        var executor=(ThreadPoolTaskExecutor)new AsyncConfig().notificationExecutor();
        var entered=new CountDownLatch(20);var release=new CountDownLatch(1);
        Runnable blocked=()->{entered.countDown();try{release.await();}catch(InterruptedException e){Thread.currentThread().interrupt();}};
        try {
            // Real configured executor: 20 workers + 100 queued tasks exhaust admission.
            for(int i=0;i<120;i++)executor.execute(blocked);
            assertTrue(entered.await(5,TimeUnit.SECONDS));
            assertEquals(100,executor.getThreadPoolExecutor().getQueue().size());
            var service=new NotificationService(null,null,null,null,null,null,executor);
            var transactions=new RecordingTransactions();
            var template=new TransactionTemplate(transactions);
            var laterAfterCommit=new AtomicBoolean();
            assertDoesNotThrow(()->template.execute(status->{
                service.sendNotification(UUID.randomUUID(),null,"Audit","Audit",null);
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
                    @Override public void afterCommit(){laterAfterCommit.set(true);}
                });
                return null;
            }));
            assertEquals(1,transactions.commits);
            assertEquals(0,transactions.rollbacks);
            assertTrue(laterAfterCommit.get());
        } finally {
            release.countDown();executor.shutdown();
            assertTrue(executor.getThreadPoolExecutor().awaitTermination(5,TimeUnit.SECONDS));
        }
    }

    static class InterleavingList extends CopyOnWriteArrayList<SseEmitter> {
        Runnable afterEmptyCheck;
        InterleavingList(List<SseEmitter> original){super(original);}
        @Override public boolean isEmpty(){
            boolean empty=super.isEmpty();
            if(empty&&afterEmptyCheck!=null){var hook=afterEmptyCheck;afterEmptyCheck=null;hook.run();}
            return empty;
        }
    }

    @Test void closingOldConnectionPreservesNewSubscription() throws Exception {
        var service=new SseEmitterService();var user=UUID.randomUUID();
        var executor=Executors.newFixedThreadPool(2);
        try {
            for(int i=0;i<100;i++) {
                var old=service.subscribe(user);var gate=new CountDownLatch(1);
                var removal=executor.submit(()->{gate.await();service.removeEmitter(user,old);return null;});
                var addition=executor.submit(()->{gate.await();return service.subscribe(user);});
                gate.countDown();removal.get(5,TimeUnit.SECONDS);var current=addition.get(5,TimeUnit.SECONDS);
                assertEquals(1,service.getActiveEmitterCount(user));
                service.removeEmitter(user,current);
            }
            assertEquals(0,service.getTotalActiveUsers());
        } finally {executor.shutdownNow();}
    }
}
