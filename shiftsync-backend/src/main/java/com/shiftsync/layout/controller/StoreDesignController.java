package com.shiftsync.layout.controller;
import com.shiftsync.layout.service.StoreDesignService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor @RequestMapping("/api/stores/{storeId}/design")
public class StoreDesignController {
 private final StoreDesignService service;
 public record Save(@Min(0) long baseRevision,@NotNull Map<String,Object> document) {}
 @GetMapping @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #storeId)")
 public StoreDesignService.Snapshot latest(@PathVariable UUID storeId){return service.latest(storeId);}
 @GetMapping("/versions") @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #storeId)")
 public List<StoreDesignService.Version> versions(@PathVariable UUID storeId){return service.versions(storeId);}
 @GetMapping("/versions/{revision}") @PreAuthorize("hasRole('ADMIN') or @storeAccessService.canAccessStore(authentication, #storeId)")
 public StoreDesignService.Snapshot version(@PathVariable UUID storeId,@PathVariable long revision){return service.version(storeId,revision);}
 @PutMapping @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
 public StoreDesignService.Snapshot save(@PathVariable UUID storeId,@Valid @RequestBody Save request){return service.saveMap(storeId,request.baseRevision(),request.document());}
}
