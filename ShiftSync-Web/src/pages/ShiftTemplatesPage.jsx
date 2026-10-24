import {useEffect,useRef,useState} from 'react';
import api from '../services/api';
import {useToast} from '../context/ToastContext';
import './shift-templates.css';

export default function ShiftTemplatesPage(){
 const [storeId,setStoreId]=useState(()=>localStorage.getItem('selectedStoreId')||'');
 useEffect(()=>{const update=()=>setStoreId(localStorage.getItem('selectedStoreId')||'');window.addEventListener('storeChanged',update);return()=>window.removeEventListener('storeChanged',update);},[]);
 return <TemplateList key={storeId} storeId={storeId}/>;
}
function TemplateList({storeId}){
 const toast=useToast(),controller=useRef(null);
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const [form,setForm]=useState(null);
 useEffect(()=>{
  const abort=new AbortController();controller.current=abort;
  if(!storeId)return()=>abort.abort();
  api.get(`/stores/${storeId}/shift-templates`,{signal:abort.signal}).then(({data})=>{if(!abort.signal.aborted){setItems(Array.isArray(data)?data:[]);setLoading(false);}}).catch(e=>{if(!abort.signal.aborted){setError(e.response?.data?.message||'Không tải được mẫu ca.');setLoading(false);}});
  return()=>abort.abort();
 },[storeId,retry]);
 const refresh=()=>{setError('');setLoading(true);setRetry(n=>n+1);};
 const save=async event=>{
  event.preventDefault();if(busy)return;
  setBusy(true);
  try{
   const body={name:form.name.trim(),startTime:form.startTime,endTime:form.endTime};
   if(!body.name)throw new Error('Vui lòng nhập tên mẫu ca.');
   const config={signal:controller.current.signal};
   if(form.id)await api.put(`/stores/${storeId}/shift-templates/${form.id}`,body,config);
   else await api.post(`/stores/${storeId}/shift-templates`,body,config);
   if(controller.current.signal.aborted)return;
   setForm(null);toast.success('Đã lưu mẫu ca.');refresh();
  }catch(e){if(!controller.current.signal.aborted)toast.error(e.response?.data?.message||e.message||'Không lưu được mẫu ca.');}
  finally{if(!controller.current.signal.aborted)setBusy(false);}
 };
 const remove=async item=>{
  if(busy||!window.confirm(`Xóa mẫu ca “${item.name}”? Các ca đã tạo không bị xóa.`))return;
  setBusy(true);
  try{await api.delete(`/stores/${storeId}/shift-templates/${item.id}`,{signal:controller.current.signal});if(!controller.current.signal.aborted){toast.success('Đã xóa mẫu ca.');refresh();}}
  catch(e){if(!controller.current.signal.aborted)toast.error(e.response?.data?.message||'Không xóa được mẫu ca.');}
  finally{if(!controller.current.signal.aborted)setBusy(false);}
 };
 return <div className="st-page"><header><div><h1>Mẫu ca</h1><p>Quản lý tên và khung giờ ca làm cho chi nhánh đang chọn.</p></div><button type="button" disabled={!storeId||busy} onClick={()=>setForm({name:'',startTime:'08:00',endTime:'16:00'})}>Thêm mẫu ca</button></header>
  {form&&<form className="st-form" onSubmit={save}><h2>{form.id?'Chỉnh sửa mẫu ca':'Tạo mẫu ca'}</h2><div className="st-fields"><label>Tên mẫu<input required maxLength={120} value={form.name} disabled={busy} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Bắt đầu<input type="time" required value={form.startTime} disabled={busy} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Kết thúc<input type="time" required value={form.endTime} disabled={busy} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div><div className="st-actions"><button type="button" disabled={busy} onClick={()=>setForm(null)}>Hủy</button><button type="submit" disabled={busy}>{busy?'Đang lưu…':'Lưu mẫu ca'}</button></div></form>}
  {!storeId?<p>Chọn chi nhánh trên thanh điều hướng để xem mẫu ca.</p>:loading?<p role="status">Đang tải mẫu ca…</p>:error?<div role="alert">{error} <button type="button" onClick={refresh}>Thử lại</button></div>:<div className="st-table"><table><thead><tr><th>Tên mẫu</th><th>Khung giờ</th><th>Giờ hoạt động</th><th>Thao tác</th></tr></thead><tbody>{items.filter(i=>i.isActive!==false).map(item=><tr key={item.id}><td>{item.name}</td><td>{item.startTime?.slice(0,5)}–{item.endTime?.slice(0,5)}</td><td>{item.isWithinOperatingHours===false?'Ngoài giờ hoạt động':item.isWithinOperatingHours===true?'Trong giờ hoạt động':'Chưa có thông tin'}</td><td><div className="st-actions"><button type="button" disabled={busy} onClick={()=>setForm({...item,startTime:item.startTime.slice(0,5),endTime:item.endTime.slice(0,5)})}>Sửa</button><button type="button" disabled={busy} onClick={()=>remove(item)}>Xóa</button></div></td></tr>)}</tbody></table>{!items.some(i=>i.isActive!==false)&&<p>Chưa có mẫu ca. Thêm mẫu để lưu tên và khung giờ thường dùng.</p>}</div>}
 </div>;
}
