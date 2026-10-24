package com.shiftsync.layout.repository;
import com.shiftsync.layout.entity.StoreDesignVersion;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface StoreDesignRepository extends JpaRepository<StoreDesignVersion,UUID> {
 Optional<StoreDesignVersion> findFirstByStoreIdOrderByRevisionDesc(UUID storeId);
 Optional<StoreDesignVersion> findByStoreIdAndRevision(UUID storeId,long revision);
 List<StoreDesignVersion> findTop20ByStoreIdOrderByRevisionDesc(UUID storeId);
 // Serialize initial creation as well as later saves; no lost updates across editors.
 @Query(value="SELECT id FROM store WHERE id=:storeId AND deleted=false FOR UPDATE",nativeQuery=true)
 Optional<UUID> lockStore(@Param("storeId") UUID storeId);
}
