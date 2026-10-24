package com.shiftsync.layout.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity @Table(name="store_design_versions") @Getter @Setter @NoArgsConstructor
public class StoreDesignVersion {
 @Id private UUID id;
 @Column(nullable=false) private UUID storeId;
 @Column(nullable=false) private long revision;
 @Column(nullable=false,columnDefinition="text") private String document;
 @Column(nullable=false) private OffsetDateTime createdAt;
}
