import {areSameStaff} from '../utils/staffIdentity.js';

export function findStaffAvatar(scene,employee){
 let result=null;
 scene?.traverse(node=>{
  if(!result&&node.isGroup&&node.userData?.isAvatarRoot&&areSameStaff(node.userData.employee,employee))result=node;
 });
 return result;
}
export function belongsToScene(object,scene){
 for(let node=object;node;node=node.parent)if(node===scene)return true;
 return false;
}
