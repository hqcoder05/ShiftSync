package com.shiftsync.layout.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
@Entity
@Table(name = "workstation_equipment")
@Getter @Setter @NoArgsConstructor
public class Equipment {
 @Id @GeneratedValue private UUID id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="workstation_id", nullable=false)
 private Workstation workstation;
 @Column(nullable=false, length=150) private String name;
 @Column(nullable=false, length=50) private String code;
 @Column(nullable=false, length=80) private String type;
 @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private Status status;
 @Column(length=1000) private String notes;
 public enum Status { OPERATIONAL, MAINTENANCE, OUT_OF_SERVICE, RETIRED }
}
