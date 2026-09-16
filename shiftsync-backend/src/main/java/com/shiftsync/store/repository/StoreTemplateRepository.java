package com.shiftsync.store.repository;

import com.shiftsync.store.entity.StoreTemplate;
import com.shiftsync.store.enums.StoreCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StoreTemplateRepository extends JpaRepository<StoreTemplate, UUID> {
    List<StoreTemplate> findByCategory(StoreCategory category);
}
