const {withAndroidManifest,withDangerousMod}=require('expo/config-plugins');
const fs=require('fs/promises'),path=require('path');
const {privateIPv4}=require('../scripts/demo-endpoint.cjs');
const reference='@xml/shiftsync_network_security';
function networkXml(host){
  if(host&&!privateIPv4(host))throw new Error('Invalid LAN IPv4 host.');
  return `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false" />\n${host?`  <domain-config cleartextTrafficPermitted="true">\n    <domain includeSubdomains="false">${host}</domain>\n  </domain-config>\n`:''}</network-security-config>\n`;
}
module.exports=function withLanDemo(config){
  const host=config.extra?.demoMode==='lan'?config.extra.demoLanHost:null;
  if(host&&!privateIPv4(host))throw new Error('Invalid LAN demo configuration.');
  config=withAndroidManifest(config,mod=>{
    const application=mod.modResults.manifest.application?.[0];
    if(!application)throw new Error('Missing Android application manifest.');
    if(host)application.$['android:networkSecurityConfig']=reference;
    else if(application.$['android:networkSecurityConfig']===reference)delete application.$['android:networkSecurityConfig'];
    return mod;
  });
  return withDangerousMod(config,['android',async mod=>{
    const directory=path.join(mod.modRequest.platformProjectRoot,'app','src','main','res','xml');
    await fs.mkdir(directory,{recursive:true});
    await fs.writeFile(path.join(directory,'shiftsync_network_security.xml'),networkXml(host),'utf8');
    return mod;
  }]);
};
module.exports.networkXml=networkXml;
