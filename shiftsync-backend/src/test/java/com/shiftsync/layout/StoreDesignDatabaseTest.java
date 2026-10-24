package com.shiftsync.layout;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.layout.service.StoreDesignService;
import com.shiftsync.layout.repository.StoreDesignRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.*;
import org.springframework.transaction.annotation.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties={"spring.jpa.show-sql=false","spring.jpa.properties.hibernate.generate_statistics=false"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import({StoreDesignService.class,StoreDesignDatabaseTest.Config.class})
@EnabledIfEnvironmentVariable(named="SHIFTSYNC_DESIGN_TEST_DB",matches="shiftsync_design_test_[a-z0-9]+")
class StoreDesignDatabaseTest {
 @TestConfiguration static class Config {@Bean ObjectMapper designMapper(){return new ObjectMapper();}}
 @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->"jdbc:postgresql://127.0.0.1:5432/"+System.getenv("SHIFTSYNC_DESIGN_TEST_DB"));r.add("spring.datasource.username",()->System.getenv("SHIFTSYNC_DESIGN_TEST_USER"));r.add("spring.datasource.password",()->System.getenv("SHIFTSYNC_DESIGN_TEST_PASSWORD"));}
 @Autowired StoreDesignService service;@Autowired StoreRepository stores;@Autowired StoreDesignRepository designs;@Autowired ObjectMapper mapper;
 @Test void migrationAndImmutableHistoryPersistInPostgres()throws Exception{
  Store store=stores.saveAndFlush(Store.builder().name("ISOLATED DESIGN TEST").build());var doc=mapper.readTree("{\"schemaVersion\":1,\"floor\":{\"length\":24,\"width\":16,\"height\":3.5},\"items\":[]}");
  assertEquals(1,service.save(store.getId(),0,doc).revision());assertEquals(2,service.save(store.getId(),1,doc).revision());assertEquals(2,service.latest(store.getId()).revision());assertEquals(1,service.version(store.getId(),1).revision());assertEquals(2,service.versions(store.getId()).size());
  assertTrue(service.versions(UUID.randomUUID()).isEmpty());
 }
 @Test @Transactional(propagation=Propagation.NOT_SUPPORTED) void concurrentEditorsCannotLoseAnUpdate()throws Exception{
  UUID storeId=stores.saveAndFlush(Store.builder().name("ISOLATED CONCURRENCY TEST").build()).getId();var doc=mapper.readTree("{\"schemaVersion\":1,\"floor\":{\"length\":24,\"width\":16,\"height\":3.5},\"items\":[]}");
  CountDownLatch start=new CountDownLatch(1);ExecutorService executor=Executors.newFixedThreadPool(2);
  try{Callable<Boolean> save=()->{start.await();try{service.save(storeId,0,doc);return true;}catch(com.shiftsync.shared.exception.BusinessException e){assertEquals(409,e.getStatus().value());return false;}};
   Future<Boolean> a=executor.submit(save),b=executor.submit(save);start.countDown();assertNotEquals(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS));assertEquals(1,service.latest(storeId).revision());assertEquals(1,designs.findTop20ByStoreIdOrderByRevisionDesc(storeId).size());
  }finally{executor.shutdownNow();}
 }
}
