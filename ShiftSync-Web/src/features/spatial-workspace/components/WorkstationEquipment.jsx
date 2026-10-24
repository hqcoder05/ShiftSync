import { useEffect, useId, useRef, useState } from 'react';
import { Box, Plus, Pencil, RefreshCw } from 'lucide-react';
import { getWorkstationEquipment, createWorkstationEquipment, updateWorkstationEquipment } from '../../../services/layoutService.js';
import './store-explorer.css';
const labels = { OPERATIONAL: 'Hoạt động', MAINTENANCE: 'Bảo trì', OUT_OF_SERVICE: 'Ngừng hoạt động', RETIRED: 'Đã thanh lý' };
const blank = { name: '', code: '', type: '', status: 'OPERATIONAL', notes: '' };
export default function WorkstationEquipment(props) {
 return <EquipmentPanel key={`${props.storeId}/${props.workstationId}`} {...props} />;
}
function EquipmentPanel({ storeId, workstationId, canEdit = false }) {
 const key = `${storeId}/${workstationId}`;
 const [state, setState] = useState(null);
 const [retry, setRetry] = useState(0);
 const [editor, setEditor] = useState(null);
 const [saving, setSaving] = useState(false);
 const [saveError, setSaveError] = useState('');
 const [notice, setNotice] = useState('');
 const activeKey = useRef(key);
 const busy = useRef(false);
 const id = useId();
 useEffect(() => {
  setEditor(null); setSaveError(''); setNotice('');
  if (!storeId || !workstationId) return;
  const controller = new AbortController();
  setState({ key, loading: true });
  getWorkstationEquipment(storeId, workstationId, controller.signal).then(response => {
   if (!controller.signal.aborted) {
    if (!Array.isArray(response.data)) throw new Error('Invalid equipment response');
    setState({ key, items: response.data });
   }
  }).catch(() => { if (!controller.signal.aborted) setState({ key, error: true }); });
  return () => controller.abort();
 }, [storeId, workstationId, key, retry]);
 useEffect(() => { activeKey.current = key; return () => { activeKey.current = null; }; }, [key]);
 const current = state?.key === key ? state : null;
 const openEditor = item => { setEditor({ key, id: item?.id, values: item ? { name: item.name, code: item.code, type: item.type, status: item.status, notes: item.notes || '' } : { ...blank } }); setSaveError(''); setNotice(''); };
 const form = editor?.key === key ? editor : null;
 const save = async event => {
  event.preventDefault();
  if (!canEdit || !form || busy.current) return;
  busy.current = true; setSaving(true); setSaveError('');
  const payload = Object.fromEntries(Object.entries(form.values).map(([name,value]) => [name,value.trim()]));
  try {
   const response = form.id ? await updateWorkstationEquipment(storeId, workstationId, form.id, payload) : await createWorkstationEquipment(storeId, workstationId, payload);
   if (activeKey.current !== key) return;
   setState(previous => ({ key, items: [...(previous?.items || []).filter(item => item.id !== response.data.id), response.data].sort((a,b) => a.code.localeCompare(b.code)) }));
   setEditor(null); setNotice(form.id ? 'Đã cập nhật thiết bị.' : 'Đã thêm thiết bị.');
  } catch (error) {
   if (activeKey.current === key) setSaveError(error.response?.status === 409 ? 'Mã thiết bị đã tồn tại trong trạm. Hãy dùng mã khác.' : error.response?.status === 403 ? 'Bạn không có quyền thay đổi thiết bị tại trạm này.' : 'Không lưu được thiết bị. Nội dung đã nhập được giữ lại để bạn thử lại.');
  } finally { busy.current = false; if (activeKey.current === key) setSaving(false); }
 };
 return <section className="se-equipment" aria-label="Thiết bị tại trạm">
  <div className="se-section-heading"><h3><Box size={16}/>Thiết bị {current?.items && <span className="se-count">{current.items.length}</span>}</h3>{canEdit && current?.items && !form && <button className="se-button" type="button" onClick={() => openEditor(null)}><Plus size={14}/>Thêm thiết bị</button>}</div>
  {notice && <p className="se-success" role="status">{notice}</p>}
  {!storeId || !workstationId ? <p className="se-empty">Chưa chọn trạm.</p> : !current || current.loading ? <p className="se-empty" role="status">Đang tải thiết bị…</p> : current.error ? <div className="se-error" role="alert"><p>Không tải được thiết bị.</p><button className="se-button" type="button" onClick={() => setRetry(n => n + 1)}><RefreshCw size={14}/>Thử lại</button></div> : <>
   {form && <form onSubmit={save} className="se-equipment-form" aria-label={form.id ? 'Sửa thiết bị' : 'Thêm thiết bị'}>
    <strong>{form.id ? 'Sửa thiết bị' : 'Thêm thiết bị vào trạm'}</strong>
    {[['name','Tên thiết bị',150],['code','Mã thiết bị',50],['type','Loại thiết bị',80]].map(([field,label,max]) => <label className="se-field" htmlFor={`${id}-${field}`} key={field}>{label}<input id={`${id}-${field}`} value={form.values[field]} maxLength={max} required disabled={saving} onChange={event => setEditor(previous => ({...previous,values:{...previous.values,[field]:event.target.value}}))}/></label>)}
    <label className="se-field" htmlFor={`${id}-status`}>Trạng thái<select aria-label="Trạng thái" id={`${id}-status`} value={form.values.status} disabled={saving} onChange={event => setEditor(previous => ({...previous,values:{...previous.values,status:event.target.value}}))}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="se-field" htmlFor={`${id}-notes`}>Ghi chú <span>(tùy chọn)</span><textarea id={`${id}-notes`} value={form.values.notes} maxLength={1000} rows={2} disabled={saving} onChange={event => setEditor(previous => ({...previous,values:{...previous.values,notes:event.target.value}}))}/></label>
    {saveError && <p className="se-error" role="alert">{saveError}</p>}
    <div className="se-form-actions"><button type="button" className="se-button" disabled={saving} onClick={() => setEditor(null)}>Hủy</button><button type="submit" className="se-button se-primary" disabled={saving || !form.values.name.trim() || !form.values.code.trim() || !form.values.type.trim()}>{saving ? 'Đang lưu…' : 'Lưu thiết bị'}</button></div>
   </form>}
   {current.items.length === 0 ? <p className="se-empty">Trạm chưa có thiết bị được ghi nhận.{canEdit && ' Chọn “Thêm thiết bị” để ghi nhận thiết bị thực tế.'}</p> : <ul className="se-equipment-list">{current.items.map(item => <li key={item.id}><div className="se-equipment-title"><strong>{item.name}</strong>{canEdit && <button type="button" className="se-icon-button" disabled={saving} aria-label={`Sửa ${item.name}`} onClick={() => openEditor(item)}><Pencil size={14}/></button>}</div><div className="se-equipment-meta"><span>{item.code} · {item.type}</span><span className={`se-status se-status--${item.status?.toLowerCase()}`}>{labels[item.status] || 'Chưa rõ trạng thái'}</span></div>{item.notes && <p className="se-equipment-notes">{item.notes}</p>}</li>)}</ul>}
  </>}
 </section>;
}
