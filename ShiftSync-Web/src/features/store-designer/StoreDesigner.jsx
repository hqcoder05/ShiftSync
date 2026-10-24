import {useEffect,useMemo,useRef,useState,Suspense} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls,TransformControls,Html} from '@react-three/drei';
import {X,Save,Undo2,Redo2,Copy,Trash2,Lock,Unlock,Group,Ungroup,Download,Upload,RotateCw,Plus,Search,Box,Armchair,TreePine,BrickWall,Move,History} from 'lucide-react';
import {loadDigitalTwinModel,mapWorkstationsToGlb} from '../spatial-workspace/scene/DigitalTwinModelLoader.js';
import {disposeHierarchy} from '../spatial-workspace/scene/ResourceManager.js';
import {arrangeStoreInterior} from '../spatial-workspace/scene/StoreArrangement.js';
import {CATALOG,assetById} from './catalog.js';
import {clone,editDesign,emptyDesign,isLocked,newId,seedDesign,validateDesign} from './designModel.js';
import {buildDesignModel,disposeDesignModel} from './designScene.js';
import {saveStoreDesign,getDesignVersions,getDesignVersion} from './designService.js';
import './store-designer.css';

function DesignScene({doc,source,selection,onSelect,onTransform,topDown}) {
 const model=useMemo(()=>buildDesignModel(doc,source),[doc,source]);
 const orbit=useRef(),transform=useRef();
 const target=selection.length===1?model.designNodes.get(selection[0]):null;
 useEffect(()=>()=>disposeDesignModel(model),[model]);
 useEffect(()=>{if(!orbit.current)return;orbit.current.object.position.set(topDown?0:22,topDown?30:22,topDown ? .01 : 24);orbit.current.target.set(0,0,0);orbit.current.update();},[topDown]);
 return <>
  <color attach="background" args={['#eee9df']}/><ambientLight intensity={1.7}/><directionalLight position={[8,18,10]} intensity={2} castShadow shadow-mapSize={[1024,1024]}/>
  <primitive object={model.modelRoot} dispose={null} onPointerDown={event=>{
   if(event.button!==0)return;event.stopPropagation();
   if(transform.current?.axis || transform.current?.dragging)return;
   let node=event.object,item;
   while(node){if(node.userData.designItemId)item=node.userData.designItemId;node=node.parent;}
   onSelect(item,event.nativeEvent.shiftKey);
  }}/>
  <gridHelper args={[Math.max(doc.floor.length,doc.floor.width),Math.ceil(Math.max(doc.floor.length,doc.floor.width)*2),'#b5a38b','#d6cab9']} position={[0,.008,0]}/>
  <OrbitControls ref={orbit} makeDefault maxPolarAngle={Math.PI/2-.03} minDistance={2} maxDistance={130}/>
  {target&&<boxHelper key={target.uuid} args={[target,'#dd8d00']}/>}
  {target&&!isLocked(doc,selection[0])&&<TransformControls ref={transform} object={target} mode="translate" size={.8} onMouseDown={()=>{if(orbit.current)orbit.current.enabled=false;}} onMouseUp={()=>{
   if(orbit.current)orbit.current.enabled=true;
   if(!onTransform(selection[0],{position:target.position.toArray().map(n=>Math.round(n*4)/4)}))target.position.fromArray(doc.items.find(i=>i.id===selection[0]).position);
  }}/ >}
 </>;
}
function NumberField({label,value,min=-100,max=100,step=.25,onCommit,disabled=false}){
 return <label className="sd-field">{label}<input key={String(value)} type="number" defaultValue={value} min={min} max={max} step={step} disabled={disabled} onBlur={event=>{const n=Number(event.target.value);if(event.target.value!==''&&Number.isFinite(n)&&n>=min&&n<=max&&n!==value)onCommit(n);else event.target.value=value;}} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/></label>;
}
export default function StoreDesigner(props){
 const [context]=useState(()=>({layout:props.layout,workstations:props.workstations}));
 const [source,setSource]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let current=true,loaded;loadDigitalTwinModel({}).then(data=>{if(!current){disposeHierarchy(data.modelRoot);return;}loaded=data.modelRoot;const mapped=mapWorkstationsToGlb(context.workstations,data.workstationsMap,context.layout);arrangeStoreInterior(data.modelRoot,mapped.mappedMeshes.map(m=>m.mesh),context.layout);data.modelRoot.updateMatrixWorld(true);setSource(data.modelRoot);}).catch(()=>{if(current)setError('Không tải được thư viện mô hình.');});
  return()=>{current=false;if(loaded)disposeHierarchy(loaded);};
 },[props.storeId,retry,context]);
 if(!source||!props.snapshot)return <div className="sd-overlay" role="dialog" aria-label="Thiết kế cửa hàng"><div className="sd-loading"><Box size={28}/><p>{error||'Đang mở xưởng thiết kế…'}</p>{error&&<button type="button" onClick={()=>{setError('');setRetry(n=>n+1);}}>Thử lại</button>}<button type="button" onClick={props.onClose}>Đóng</button></div></div>;
 return <DesignerSession {...props} source={source}/>;
}
function DesignerSession({storeId,storeName,layout,workstations,snapshot,source,onSaved,onClose}){
 const [initial]=useState(()=>snapshot.document||seedDesign(source,layout,workstations));
 const [history,setHistory]=useState({past:[],doc:clone(initial),future:[]});
 const [signature,setSignature]=useState(snapshot.document?JSON.stringify(snapshot.document):''),[revision,setRevision]=useState(snapshot.revision||0);
 const [selection,setSelection]=useState([]),[query,setQuery]=useState(''),[category,setCategory]=useState('Tất cả'),[tab,setTab]=useState('catalog'),[topDown,setTopDown]=useState(false);
 const [message,setMessage]=useState(snapshot.error||''),[saving,setSaving]=useState(false),[confirm,setConfirm]=useState(null),[versions,setVersions]=useState([]),[refresh,setRefresh]=useState(0);
 const busy=useRef(false),fileInput=useRef(),root=useRef(),savedFocus=useRef(null);
 const draftKey=`shiftsync:design-draft:${localStorage.getItem('userId')||'session'}:${storeId}`;
 const [draft,setDraft]=useState(()=>{try{return JSON.parse(localStorage.getItem(draftKey));}catch{return null;}});
 const doc=history.doc,dirty=JSON.stringify(doc)!==signature,selected=doc.items.find(i=>i.id===selection[0]),locked=selected&&isLocked(doc,selected.id);
 const push=document=>{setHistory(previous=>({past:[...previous.past.slice(-59),previous.doc],doc:document,future:[]}));};
 const apply=action=>{try{push(editDesign(doc,action));setMessage('');return true;}catch(error){setMessage(error.message);return false;}};
 const select=(id,multiple=false)=>{setSelection(old=>id?multiple?old.includes(id)?old.filter(x=>x!==id):[...old,id]:[id]:[]);if(id)setTab('properties');};
 const undo=()=>setHistory(h=>h.past.length?{past:h.past.slice(0,-1),doc:h.past.at(-1),future:[h.doc,...h.future]}:h);
 const redo=()=>setHistory(h=>h.future.length?{past:[...h.past,h.doc],doc:h.future[0],future:h.future.slice(1)}:h);
 useEffect(()=>{
  savedFocus.current=document.activeElement;root.current?.querySelector('button')?.focus({preventScroll:true});const prior=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=prior;savedFocus.current?.focus?.({preventScroll:true});};
 },[]);
 useEffect(()=>{
  if(!dirty){try{localStorage.removeItem(draftKey);}catch{/* Storage may be unavailable; server saving remains usable. */}return;}
  const timer=setTimeout(()=>{try{localStorage.setItem(draftKey,JSON.stringify({baseRevision:revision,document:doc}));}catch{setMessage('Không lưu được bản nháp trên máy. Hãy xuất tệp hoặc lưu lên cửa hàng.');}},500);
  const beforeUnload=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',beforeUnload);
  return()=>{clearTimeout(timer);try{localStorage.setItem(draftKey,JSON.stringify({baseRevision:revision,document:doc}));}catch{/* Server save/export are explicit alternatives. */}window.removeEventListener('beforeunload',beforeUnload);};
 },[doc,dirty,draftKey,revision]);
 useEffect(()=>{let current=true;getDesignVersions(storeId).then(({data})=>{if(current)setVersions(Array.isArray(data)?data:[]);}).catch(()=>{if(current)setVersions([]);});return()=>{current=false;};},[storeId,refresh]);
 useEffect(()=>{if(confirm)root.current?.querySelector('[role=alertdialog] button')?.focus({preventScroll:true});},[confirm]);
 const save=async()=>{
  if(busy.current)return;busy.current=true;setSaving(true);setMessage('');
  try{const valid=validateDesign(doc,workstations.map(w=>w.id));const {data}=await saveStoreDesign(storeId,revision,valid);if(!data||!Number.isInteger(data.revision)||!data.document)throw new Error('Chưa xác nhận lưu thành công: dịch vụ trả về dữ liệu không hợp lệ. Bản nháp vẫn được giữ trên máy.');
   setRevision(data.revision);setSignature(JSON.stringify(doc));onSaved(data);setRefresh(n=>n+1);setDraft(null);setMessage(`Đã lưu phiên bản ${data.revision} và áp dụng vào cửa hàng.`);
  }catch(error){setMessage(error.response?.status===409?'Có phiên bản mới trên máy chủ. Bản nháp được giữ lại; xuất tệp trước khi đóng để tải lại.':error.response?.data?.message||error.message||'Không lưu được thiết kế. Bản nháp vẫn được giữ.');}
  finally{busy.current=false;setSaving(false);}
 };
 const openImport=()=>fileInput.current?.click();
 const exportFile=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`shiftsync-design-${storeId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const importFile=async event=>{try{const file=event.target.files?.[0];if(!file)return;if(file.size>500000)throw new Error('Tệp thiết kế vượt 500KB.');push(validateDesign(JSON.parse(await file.text()),workstations.map(w=>w.id)));setSelection([]);setMessage('Đã nhập thành bản nháp. Bấm Lưu & áp dụng để sử dụng.');}catch(error){setMessage(error.message);}finally{event.target.value='';}};
 const restoreVersion=async value=>{if(!value)return;try{const{data}=await getDesignVersion(storeId,value);push(validateDesign(data.document,workstations.map(w=>w.id)));setSelection([]);setMessage(`Đã mở phiên bản ${value} thành bản nháp. Chưa ghi đè bố trí hiện tại.`);}catch(error){setMessage(error.message||'Không tải được phiên bản.');}};
 const actionButton=(label,Icon,handler,disabled=false)=><button type="button" onClick={handler} disabled={disabled||saving} title={label} aria-label={label}><Icon size={16}/><span>{label}</span></button>;
 const add=asset=>{const id=newId();apply({type:'add',asset,id});select(id);};
 const tree=(parentId=null,depth=0)=>doc.items.filter(i=>(i.parentId||null)===parentId).map(item=><div key={item.id}><button type="button" className={`sd-tree-item ${selection.includes(item.id)?'is-selected':''}`} style={{paddingLeft:10+depth*14}} aria-pressed={selection.includes(item.id)} onClick={e=>select(item.id,e.shiftKey)}>{item.asset==='group'?<Group size={14}/>:<Box size={14}/>}<span>{item.name}</span>{isLocked(doc,item.id)&&<Lock size={12}/>}</button>{tree(item.id,depth+1)}</div>);
 return <div ref={root} className="sd-overlay" role="dialog" aria-modal="true" aria-label="Thiết kế cửa hàng" onKeyDown={event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();save();return;}
  if(event.key==='Tab'){const scope=root.current.querySelector('[role=alertdialog]')||root.current;const nodes=[...scope.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}
  if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}
  if(event.key==='Escape'){event.stopPropagation();if(confirm)setConfirm(null);else setSelection([]);}
 }}>
  <header className="sd-header"><div><span className="sd-badge"><Box size={19}/></span><div><h2>Thiết kế cửa hàng</h2><small>{storeName} · {revision?`Phiên bản ${revision}`:'Chưa có bản lưu'}{dirty?' · Có thay đổi':''}</small></div></div><nav>
   {actionButton('Hoàn tác',Undo2,undo,!history.past.length)}{actionButton('Làm lại',Redo2,redo,!history.future.length)}
   <button type="button" className="sd-save" disabled={saving||!dirty} onClick={save}><Save size={16}/>{saving?'Đang lưu…':'Lưu & áp dụng'}</button>
   {actionButton('Đóng thiết kế',X,()=>dirty?setConfirm('exit'):onClose())}
  </nav></header>
  <div className="sd-tools"><div>{actionButton('Di chuyển',Move,()=>setMessage('Chọn đồ vật rồi kéo mũi tên trục. Shift + click để chọn nhiều món.'))}{actionButton('Nhân bản',Copy,()=>apply({type:'duplicate',ids:selection}),!selection.length||locked)}{actionButton('Gom nhóm',Group,()=>apply({type:'group',ids:selection}),selection.length<2)}{actionButton('Tách nhóm',Ungroup,()=>apply({type:'ungroup',ids:selection}),!selected||selected.asset!=='group'||locked)}{actionButton(selected?.locked?'Mở khóa':'Khóa',selected?.locked?Unlock:Lock,()=>apply({type:'lock',ids:selection}),!selection.length)}{actionButton('Xóa',Trash2,()=>setConfirm('delete'),!selection.length||locked)}</div><div><button type="button" onClick={()=>setTopDown(v=>!v)}>{topDown?'Góc phối cảnh':'Nhìn từ trên'}</button>{actionButton('Xuất tệp',Download,exportFile)}<button type="button" aria-label="Nhập tệp" onClick={openImport}><Upload size={16}/><span>Nhập tệp</span></button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importFile}/></div></div>
  {message&&<div className="sd-message" role="status">{message}<button type="button" aria-label="Ẩn thông báo" onClick={()=>setMessage('')}><X size={14}/></button></div>}
  <div className="sd-mobile-tabs"><button type="button" aria-pressed={tab==='catalog'} onClick={()=>setTab(tab==='catalog'?'scene':'catalog')}>Thư viện</button><button type="button" aria-pressed={tab==='properties'} onClick={()=>setTab(tab==='properties'?'scene':'properties')}>Đồ vật & thuộc tính</button></div>
  <main className={`sd-main sd-tab-${tab}`}>
   <aside className="sd-library" aria-label="Thư viện đồ vật"><div className="sd-panel-heading"><h3>Thư viện đồ vật</h3><span>{CATALOG.length} mẫu</span></div><label className="sd-search"><Search size={15}/><input aria-label="Tìm đồ vật" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm đồ vật…"/></label><div className="sd-categories">{['Tất cả','Trạm','Nội thất','Trang trí','Kiến trúc'].map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="sd-catalog">{CATALOG.filter(a=>(category==='Tất cả'||a.category===category)&&a.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).map(asset=>{const Icon=asset.category==='Trạm'?Box:asset.category==='Nội thất'?Armchair:asset.category==='Kiến trúc'?BrickWall:TreePine;return <button type="button" key={asset.id} onClick={()=>add(asset.id)}><span className={`sd-asset-icon sd-asset-${asset.category}`}><Icon size={25}/></span><strong>{asset.name}</strong><small><Plus size={12}/>Thêm vào cửa hàng</small></button>;})}</div><div className="sd-library-bottom"><strong>Mặt bằng</strong><div className="sd-numbers">{[['length','Dài (m)'],['width','Rộng (m)'],['height','Cao (m)']].map(([key,label])=><NumberField key={key} label={label} value={doc.floor[key]} min={2} max={100} onCommit={n=>apply({type:'floor',values:{[key]:n}})}/>)}</div><button type="button" onClick={()=>setConfirm('empty')}>Tạo mặt bằng trống</button><button type="button" onClick={()=>setConfirm('template')}>Dùng mẫu quán</button></div></aside>
   <section className="sd-viewport" aria-label="Khung thiết kế 3D"><Canvas shadows dpr={[1,1.5]} camera={{position:[22,22,24],fov:45}}><Suspense fallback={<Html center>Đang dựng cảnh…</Html>}><DesignScene doc={doc} source={source} selection={selection} onSelect={select} onTransform={(id,values)=>apply({type:'update',id,values})} topDown={topDown}/></Suspense></Canvas><div className="sd-scene-hint">Kéo trục để di chuyển · Chuột phải để dịch góc nhìn · Shift + click chọn nhiều</div><span className="sd-count">{doc.items.length}/150 đồ vật · Đơn vị mét</span></section>
   <aside className="sd-properties" aria-label="Thuộc tính thiết kế"><div className="sd-panel-heading"><h3>{selection.length>1?`${selection.length} đồ vật được chọn`:'Thuộc tính'}</h3><span>{selected&&isLocked(doc,selected.id)?<Lock size={14}/>:null}</span></div>
    {selected&&selection.length===1?<div className="sd-properties-form"><label className="sd-field">Tên đồ vật<input value={selected.name} maxLength={120} disabled={locked} onChange={e=>apply({type:'update',id:selected.id,values:{name:e.target.value||'Đồ vật'}})}/></label><div className="sd-numbers">{['X','Y','Z'].map((axis,index)=><NumberField key={`${selected.id}/${axis}`} label={`${axis} (m)`} value={selected.position[index]} disabled={locked} onCommit={n=>apply({type:'update',id:selected.id,values:{position:selected.position.map((v,i)=>i===index?n:v)}})}/>)}</div><div className="sd-numbers"><NumberField label="Góc xoay (°)" value={Math.round(selected.rotation*180/Math.PI)} min={-18000} max={18000} step={15} disabled={locked} onCommit={n=>apply({type:'update',id:selected.id,values:{rotation:n*Math.PI/180}})}/><NumberField label="Tỷ lệ" value={selected.scale} min={.1} max={5} step={.1} disabled={locked} onCommit={n=>apply({type:'update',id:selected.id,values:{scale:n}})}/></div>{actionButton('Xoay 90°',RotateCw,()=>apply({type:'update',id:selected.id,values:{rotation:(selected.rotation+Math.PI/2)%(Math.PI*2)}}),locked)}
     {selected.dimensions&&<div className="sd-numbers">{['Dài','Cao','Dày'].map((axis,index)=><NumberField key={`${selected.id}/${axis}`} label={`${axis} (m)`} value={selected.dimensions[index]} min={.05} max={100} disabled={locked} onCommit={n=>apply({type:'update',id:selected.id,values:{dimensions:selected.dimensions.map((v,i)=>i===index?n:v)}})}/>)}</div>}
     {assetById(selected.asset)?.role&&<label className="sd-field">Gắn trạm vận hành<select aria-label="Gắn trạm vận hành" value={selected.workstationId||''} disabled={locked} onChange={e=>apply({type:'update',id:selected.id,values:{workstationId:e.target.value||null}})}><option value="">Chỉ là mô hình nội thất</option>{workstations.map(ws=><option key={ws.id} value={ws.id} disabled={doc.items.some(i=>i.id!==selected.id&&i.workstationId===ws.id)}>{ws.name||ws.code}</option>)}</select><small>Gắn trạm hiện có để nhân sự và Planner đứng đúng vị trí. Không tạo phân công mới.</small></label>}
     {locked&&<p className="sd-note">Đồ vật đang khóa. Mở khóa nhóm cha để thay đổi.</p>}
    </div>:<p className="sd-note">{selection.length>1?'Chọn Gom nhóm để kéo các món cùng nhau.':'Chọn đồ vật trong cảnh hoặc danh sách để chỉnh sửa.'}</p>}
    {workstations.some(ws=>!doc.items.some(i=>i.workstationId===ws.id))&&<p className="sd-note">Có trạm chưa gắn vào mô hình. Gắn cụm nội thất với trạm hiện có để Planner định vị đúng nhân sự.</p>}
    <div className="sd-panel-heading"><h3>Đồ vật trong cảnh</h3><small>Shift + click chọn nhiều</small></div><div className="sd-tree">{tree()}{!doc.items.length&&<p className="sd-note">Mặt bằng trống. Thêm đồ từ thư viện bên trái.</p>}</div>
    <div className="sd-versions"><h3><History size={15}/>Phiên bản đã lưu</h3><select aria-label="Khôi phục phiên bản" value="" onChange={e=>restoreVersion(e.target.value)}><option value="">Chọn phiên bản để xem lại…</option>{versions.map(v=><option key={v.revision} value={v.revision}>Phiên bản {v.revision} · {new Date(v.createdAt).toLocaleString('vi-VN')}</option>)}</select>{draft&&<button type="button" onClick={()=>{try{push(validateDesign(draft.document,workstations.map(w=>w.id)));setRevision(draft.baseRevision);setDraft(null);setMessage('Đã khôi phục bản nháp trên máy.');}catch(e){setMessage(e.message);}}}>Khôi phục bản nháp trên máy</button>}</div>
   </aside>
  </main>
  {confirm&&<div className="sd-confirm-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="sd-confirm-title"><h3 id="sd-confirm-title">{confirm==='exit'?'Đóng khi chưa lưu?':confirm==='empty'?'Tạo mặt bằng trống?':confirm==='template'?'Thay bằng mẫu quán?':'Xóa các đồ vật được chọn?'}</h3><p>{confirm==='exit'?'Bạn có thể giữ bản nháp trên máy để mở lại sau.':confirm==='empty'||confirm==='template'?'Thay đổi chỉ ở bản nháp. Bạn có thể hoàn tác trước khi lưu.':'Các món con trong nhóm cũng bị xóa. Bạn có thể hoàn tác.'}</p><div><button type="button" onClick={()=>setConfirm(null)}>Quay lại</button><button type="button" onClick={()=>{if(confirm==='exit'){try{localStorage.setItem(draftKey,JSON.stringify({baseRevision:revision,document:doc}));}catch{/* Explicit save/export remains available. */}onClose();}else if(confirm==='template'){push(seedDesign(source,doc.floor,workstations));setSelection([]);}else if(confirm==='empty'){push(emptyDesign(doc.floor));setSelection([]);}else{apply({type:'delete',ids:selection});setSelection([]);}setConfirm(null);}}>{confirm==='exit'?'Giữ bản nháp & đóng':'Xác nhận'}</button></div></section></div>}
 </div>;
}
