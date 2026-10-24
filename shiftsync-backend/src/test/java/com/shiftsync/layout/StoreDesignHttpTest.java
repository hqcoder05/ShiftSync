package com.shiftsync.layout;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.layout.controller.StoreDesignController;
import com.shiftsync.layout.service.StoreDesignService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class StoreDesignHttpTest {
 @Test void defaultMvcConvertersRoundTripTheSceneDocument()throws Exception{
  var service=mock(StoreDesignService.class);var controller=new StoreDesignController(service);var mapper=new ObjectMapper();
  var document=mapper.readTree("{\"schemaVersion\":1,\"floor\":{\"length\":24,\"width\":16,\"height\":3.5},\"items\":[]}");
  Map<String,Object> response=Map.of("schemaVersion",1,"floor",Map.of("length",24,"width",16,"height",3.5),"items",List.of());
  when(service.saveMap(any(),eq(0L),any())).thenReturn(new StoreDesignService.Snapshot(1,response,null));
  var mvc=MockMvcBuilders.standaloneSetup(controller).build();
  mvc.perform(put("/api/stores/"+UUID.randomUUID()+"/design").contentType(MediaType.APPLICATION_JSON).content("{\"baseRevision\":0,\"document\":"+document+"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.document.schemaVersion").value(1)).andExpect(jsonPath("$.document.items").isArray());
 }
}
