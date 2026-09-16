package com.shiftsync.store.entity;

import com.shiftsync.store.enums.StoreCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "store_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private StoreCategory category;

    @Column(name = "format", nullable = false)
    private String format;

    @Column(name = "description")
    private String description;

    @Column(name = "template_data", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String templateData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
