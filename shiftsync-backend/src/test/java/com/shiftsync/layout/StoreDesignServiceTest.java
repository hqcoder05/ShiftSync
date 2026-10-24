package com.shiftsync.layout;
import com.fasterxml.jackson.databind.*;
import com.shiftsync.layout.entity.StoreDesignVersion;
import com.shiftsync.layout.repository.*;
import com.shiftsync.layout.service.StoreDesignService;
import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class StoreDesignServiceTest {
 ObjectMapper mapper=new ObjectMapper();StoreDesignRepository repository=mock(StoreDesignRepository.class);WorkstationRepository workstations=mock(WorkstationRepository.class);
 StoreDesignService service=new StoreDesignService(repository,workstations,mapper);UUID storeId=UUID.randomUUID();
 JsonNode document() throws Exception{return mapper.readTree("{\"schemaVersion\":1,\"floor\":{\"length\":24,\"width\":16,\"height\":3.5},\"items\":[]}");}
 @BeforeEach void setup(){when(repository.lockStore(storeId)).thenReturn(Optional.of(storeId));when(repository.findFirstByStoreIdOrderByRevisionDesc(storeId)).thenReturn(Optional.empty());when(repository.saveAndFlush(any())).thenAnswer(call->call.getArgument(0));when(workstations.findByStoreId(storeId)).thenReturn(List.of());}
 @Test void firstSaveAndLoadRevision()throws Exception{var saved=service.save(storeId,0,document());assertEquals(1,saved.revision());assertEquals(document(),mapper.valueToTree(saved.document()));verify(repository).lockStore(storeId);}
 @Test void staleSaveDoesNotOverwrite()throws Exception{StoreDesignVersion current=new StoreDesignVersion();current.setRevision(4);when(repository.findFirstByStoreIdOrderByRevisionDesc(storeId)).thenReturn(Optional.of(current));var e=assertThrows(BusinessException.class,()->service.save(storeId,3,document()));assertEquals(409,e.getStatus().value());verify(repository,never()).saveAndFlush(any());}
 @Test void nonexistentStoreCannotCreateDesign()throws Exception{when(repository.lockStore(storeId)).thenReturn(Optional.empty());assertThrows(BusinessException.class,()->service.save(storeId,0,document()));verify(repository,never()).saveAndFlush(any());}
 @Test void emptyStoreHasNoInventedDesign(){assertEquals(0,service.latest(storeId).revision());assertNull(service.latest(storeId).document());}
 @Test void historyLookupIsStoreScoped(){assertThrows(BusinessException.class,()->service.version(storeId,2));verify(repository).findByStoreIdAndRevision(storeId,2);}
 @Test void rejectsForeignStationAndUnknownAsset()throws Exception{
  var doc=(com.fasterxml.jackson.databind.node.ObjectNode)document();var item=mapper.readTree("{\"id\":\"x\",\"asset\":\"barista\",\"name\":\"Test\",\"locked\":false,\"position\":[0,0,0],\"rotation\":0,\"scale\":1,\"workstationId\":\"foreign\"}");
  ((com.fasterxml.jackson.databind.node.ArrayNode)doc.get("items")).add(item);assertThrows(BusinessException.class,()->StoreDesignService.validate(doc,Set.of()));
  ((com.fasterxml.jackson.databind.node.ObjectNode)item).put("asset","script");assertThrows(BusinessException.class,()->StoreDesignService.validate(doc,Set.of("foreign")));
 }
 @Test void rejectsCycleAndExtremeDimensions()throws Exception{
  var doc=(com.fasterxml.jackson.databind.node.ObjectNode)document();((com.fasterxml.jackson.databind.node.ObjectNode)doc.get("floor")).put("length",1000);final var badDimensions=doc;assertThrows(BusinessException.class,()->StoreDesignService.validate(badDimensions,Set.of()));
  doc=(com.fasterxml.jackson.databind.node.ObjectNode)document();var a=mapper.readTree("{\"id\":\"a\",\"asset\":\"group\",\"name\":\"G\",\"locked\":false,\"position\":[0,0,0],\"rotation\":0,\"scale\":1,\"parentId\":\"a\"}");((com.fasterxml.jackson.databind.node.ArrayNode)doc.get("items")).add(a);final var cycle=doc;assertThrows(BusinessException.class,()->StoreDesignService.validate(cycle,Set.of()));
 }
}
