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

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    @Builder.Default
    private SkillLevel level = SkillLevel.BEGINNER;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    public void setLevel(String levelStr) {
        if (levelStr != null) {
            this.level = SkillLevel.valueOf(levelStr.trim().toUpperCase());
        }
    }

    public void setLevel(SkillLevel level) {
        this.level = level;
    }

    public static class StaffSkillBuilder {
        public StaffSkillBuilder level(String levelStr) {
            if (levelStr != null) {
                this.level$value = SkillLevel.valueOf(levelStr.trim().toUpperCase());
                this.level$set = true;
            }
            return this;
        }

        public StaffSkillBuilder level(SkillLevel level) {
            this.level$value = level;
            this.level$set = true;
            return this;
        }
    }
}
