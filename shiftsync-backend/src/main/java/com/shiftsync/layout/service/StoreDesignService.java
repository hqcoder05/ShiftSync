package com.shiftsync.layout.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftsync.layout.entity.StoreDesignVersion;
import com.shiftsync.layout.repository.*;
import com.shiftsync.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class StoreDesignService {
 private final StoreDesignRepository designs;
 private final WorkstationRepository workstations;
 private final ObjectMapper mapper;
 private static final Set<String> ASSETS=Set.of("group","barista","cashier","service","kitchen","bistro","booth","communal","lounge","table","chair","plant","shelf","lamp","wall","door");
 private static final Set<String> STATIONS=Set.of("barista","cashier","service","kitchen");
 public record Snapshot(long revision,Map<String,Object> document,OffsetDateTime createdAt) {}
 public record Version(long revision,OffsetDateTime createdAt) {}
 private Snapshot snapshot(StoreDesignVersion v) {
  try {return new Snapshot(v.getRevision(),mapper.readValue(v.getDocument(),new TypeReference<Map<String,Object>>() {}),v.getCreatedAt());}
  catch(Exception e){throw new IllegalStateException("Stored design is invalid",e);}
 }
 @Transactional(readOnly=true) public Snapshot latest(UUID storeId) {return designs.findFirstByStoreIdOrderByRevisionDesc(storeId).map(this::snapshot).orElse(new Snapshot(0,null,null));}
 @Transactional(readOnly=true) public List<Version> versions(UUID storeId) {return designs.findTop20ByStoreIdOrderByRevisionDesc(storeId).stream().map(v->new Version(v.getRevision(),v.getCreatedAt())).toList();}
 @Transactional(readOnly=true) public Snapshot version(UUID storeId,long revision) {return snapshot(designs.findByStoreIdAndRevision(storeId,revision).orElseThrow(()->new BusinessException("Design version not found",HttpStatus.NOT_FOUND)));}
 public Snapshot saveMap(UUID storeId,long baseRevision,Map<String,Object> document) {
  return save(storeId,baseRevision,mapper.valueToTree(document));
 }
 public Snapshot save(UUID storeId,long baseRevision,JsonNode doc) {
  if(designs.lockStore(storeId).isEmpty())throw new BusinessException("Store not found",HttpStatus.NOT_FOUND);
  long current=designs.findFirstByStoreIdOrderByRevisionDesc(storeId).map(StoreDesignVersion::getRevision).orElse(0L);
  if(baseRevision!=current)throw new BusinessException("Bố trí đã được người khác cập nhật. Hãy tải phiên bản mới nhất.",HttpStatus.CONFLICT);
  validate(doc,new HashSet<>(workstations.findByStoreId(storeId).stream().map(w->w.getId().toString()).toList()));
  StoreDesignVersion version=new StoreDesignVersion();version.setId(UUID.randomUUID());version.setStoreId(storeId);version.setRevision(current+1);version.setDocument(doc.toString());version.setCreatedAt(OffsetDateTime.now());
  return snapshot(designs.saveAndFlush(version));
 }
 private static void require(boolean value,String message){if(!value)throw new BusinessException(message);}
 private static boolean number(JsonNode n,double min,double max){return n!=null&&n.isNumber()&&Double.isFinite(n.asDouble())&&n.asDouble()>=min&&n.asDouble()<=max;}
 public static void validate(JsonNode doc,Set<String> workstationIds) {
  require(doc!=null&&doc.isObject()&&doc.toString().length()<=500_000,"Thiết kế không hợp lệ hoặc quá lớn.");
  require(doc.path("schemaVersion").isIntegralNumber()&&doc.path("schemaVersion").asInt()==1,"Phiên bản thiết kế không được hỗ trợ.");
  for(String key:List.of("length","width","height"))require(number(doc.path("floor").get(key),2,100),"Kích thước mặt bằng phải từ 2 đến 100m.");
  JsonNode items=doc.path("items");require(items.isArray()&&items.size()<=150,"Tối đa 150 đối tượng.");
  Map<String,JsonNode> map=new HashMap<>();Set<String> bindings=new HashSet<>();
  for(JsonNode i:items){
   String id=i.path("id").asText(),asset=i.path("asset").asText(),name=i.path("name").asText();
   require(!id.isBlank()&&id.length()<=80&&map.putIfAbsent(id,i)==null,"Định danh đồ vật bị trùng.");
   require(ASSETS.contains(asset)&&!name.isBlank()&&name.length()<=120&&i.path("locked").isBoolean(),"Đồ vật không thuộc thư viện hoặc thiếu tên/trạng thái khóa.");
   JsonNode p=i.path("position");require(p.isArray()&&p.size()==3,"Vị trí không hợp lệ.");
   for(JsonNode n:p)require(number(n,-100,100),"Vị trí ngoài giới hạn.");
   require(number(i.get("rotation"),-Math.PI*100,Math.PI*100)&&number(i.get("scale"),.1,5),"Góc xoay/tỷ lệ không hợp lệ.");
   if(i.hasNonNull("dimensions")){JsonNode d=i.get("dimensions");require(d.isArray()&&d.size()==3,"Kích thước đồ vật không hợp lệ.");for(JsonNode n:d)require(number(n,.05,100),"Kích thước đồ vật ngoài giới hạn.");}
   if(i.hasNonNull("workstationId")&&!i.path("workstationId").asText().isEmpty()){String binding=i.path("workstationId").asText();require(STATIONS.contains(asset)&&workstationIds.contains(binding)&&bindings.add(binding),"Trạm không thuộc cửa hàng hoặc đã được gắn vào đối tượng khác.");}
  }
  for(JsonNode i:items){Set<String> seen=new HashSet<>();JsonNode parent=i;while(parent.hasNonNull("parentId")&&!parent.path("parentId").asText().isEmpty()){
   require(seen.add(parent.path("id").asText())&&seen.size()<=8,"Nhóm bị lặp hoặc lồng quá sâu.");parent=map.get(parent.path("parentId").asText());require(parent!=null&&parent.path("asset").asText().equals("group"),"Nhóm cha không tồn tại.");
  }}
 }
}
