package com.shiftsync.skill.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "staff_skill")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    @Column(name = "skill_id", nullable = false)
    private UUID skillId;

    @Column(name = "level", nullable = false)
    @Builder.Default
    private String level = "BEGINNER";

    @Column(name = "expiration_date")
    private LocalDate expirationDate;
}
