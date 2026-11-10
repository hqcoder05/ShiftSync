package com.shiftsync.messaging.repository;

import com.shiftsync.messaging.entity.MessagingThread;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessagingThreadRepository extends JpaRepository<MessagingThread, UUID> {
    @Modifying(flushAutomatically = true)
    @Query(value = "INSERT INTO messaging_thread (id, store_id, participant_a, participant_b) " +
            "VALUES (:id, :storeId, :a, :b) ON CONFLICT (store_id, participant_a, participant_b) DO NOTHING", nativeQuery = true)
    void insertIfAbsent(@Param("id") UUID id, @Param("storeId") UUID storeId,
                        @Param("a") UUID participantA, @Param("b") UUID participantB);

    Optional<MessagingThread> findByStoreIdAndParticipantAAndParticipantB(UUID storeId, UUID a, UUID b);

    @Query("select t from MessagingThread t where t.storeId = :storeId and " +
            "(t.participantA = :userId or t.participantB = :userId) " +
            "order by coalesce(t.lastMessageAt, t.createdAt) desc, t.id desc")
    List<MessagingThread> findForParticipant(@Param("storeId") UUID storeId, @Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from MessagingThread t where t.id = :id")
    Optional<MessagingThread> findByIdForUpdate(@Param("id") UUID id);

    @Query(value = """
            SELECT COUNT(*) FROM chat_message m
            JOIN messaging_thread t ON t.id = m.thread_id
            JOIN store s ON s.id = t.store_id AND s.deleted = false
            JOIN staff a ON a.id = t.participant_a AND a.deleted = false
            JOIN staff b ON b.id = t.participant_b AND b.deleted = false
            WHERE (t.participant_a = :userId OR t.participant_b = :userId)
              AND m.sender_id <> :userId
              AND m.message_sequence > CASE WHEN t.participant_a = :userId
                  THEN t.a_read_sequence ELSE t.b_read_sequence END
              AND EXISTS (SELECT 1 FROM employment ea WHERE ea.staff_id = t.participant_a
                  AND ea.store_id = t.store_id AND ea.status = 'ACTIVE')
              AND EXISTS (SELECT 1 FROM employment eb WHERE eb.staff_id = t.participant_b
                  AND eb.store_id = t.store_id AND eb.status = 'ACTIVE')
            """, nativeQuery = true)
    long countAllUnreadForParticipant(@Param("userId") UUID userId);
}
