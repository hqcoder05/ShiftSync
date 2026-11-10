function privateIPv4(host) {
  const parts=host.split('.').map(Number);
  if(parts.length!==4||parts.some((p,i)=>!/^\d+$/.test(host.split('.')[i])||!Number.isInteger(p)||p<0||p>255))return false;
  return parts[0]===10 || parts[0]===192&&parts[1]===168 || parts[0]===172&&parts[1]>=16&&parts[1]<=31;
}
function inspectEndpoint(value, mode='', profile='') {
  let url;try{url=new URL(String(value||'').trim());}catch{throw new Error('Chưa có địa chỉ backend hợp lệ.');}
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(url.username||url.password||url.search||url.hash||host==='localhost'||host.endsWith('.localhost')||host.startsWith('127.')||['[::1]','0.0.0.0','10.0.2.2'].includes(host))throw new Error('Địa chỉ backend không được là localhost, loopback hoặc chứa thông tin đăng nhập.');
  if(mode==='lan'){
    if(profile==='production')throw new Error('Chế độ LAN chỉ dùng cho bản demo.');
    if(!privateIPv4(host)||!['http:','https:'].includes(url.protocol))throw new Error('Demo LAN cần địa chỉ IPv4 nội bộ của máy tính.');
  }else if(url.protocol!=='https:')throw new Error('Bản phân phối Internet cần địa chỉ HTTPS; chọn preview-lan để demo cùng Wi-Fi.');
  const pathname=url.pathname.replace(/\/+$/,'');
  return {host,apiUrl:url.origin+(pathname.endsWith('/api')?pathname:pathname+'/api'),lan:mode==='lan',cleartext:mode==='lan'&&url.protocol==='http:'};
}
module.exports={privateIPv4,inspectEndpoint};
