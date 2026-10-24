import {useEffect,useState,useCallback} from 'react';
import {getStoreDesign} from './designService.js';
import {validateDesign} from './designModel.js';
export function useStoreDesign(storeId) {
 const [state,setState]=useState(null),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!storeId)return;
  const controller=new AbortController();
  getStoreDesign(storeId,controller.signal).then(({data})=>{
   if(controller.signal.aborted)return;
   if(!data||Array.isArray(data)||!Number.isInteger(data.revision))throw new Error('Backend chưa hỗ trợ lưu thiết kế.');
   setState({storeId,revision:data.revision,document:data.document?validateDesign(data.document):null,ready:true});
  }).catch(error=>{if(!controller.signal.aborted)setState({storeId,revision:0,document:null,ready:false,error:error.response?.status===404?'Chưa có dịch vụ thiết kế. Cần cập nhật backend.':error.message||'Không tải được thiết kế.'});});
  return ()=>controller.abort();
 },[storeId,retry]);
 const accept=useCallback(snapshot=>setState({storeId,...snapshot,ready:true}),[storeId]);
 return {snapshot:state?.storeId===storeId?state:null,accept,reload:()=>setRetry(n=>n+1)};
}
