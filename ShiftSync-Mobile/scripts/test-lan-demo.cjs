const assert=require('assert/strict');
const {inspectEndpoint,privateIPv4}=require('./demo-endpoint.cjs');
const {networkXml}=require('../plugins/withLanDemo.cjs');
const app=require('../app.config.js'),base=require('../app.json').expo;
let checks=0;const check=(fn)=>{fn();checks++;};
for(const host of ['10.0.0.2','172.16.1.1','172.31.255.254','192.168.0.105'])check(()=>assert.equal(privateIPv4(host),true));
for(const host of ['172.15.1.1','172.32.1.1','192.169.1.1','127.0.0.1','999.1.1.1','localhost','192.168.1'])check(()=>assert.equal(privateIPv4(host),false));
check(()=>assert.equal(inspectEndpoint('http://192.168.0.105:8080','lan').apiUrl,'http://192.168.0.105:8080/api'));
check(()=>assert.equal(inspectEndpoint('https://example.invalid/api').apiUrl,'https://example.invalid/api'));
for(const value of ['http://localhost:8080/api','http://127.0.0.1/api','http://8.8.8.8/api','file:///api','http://user:pass@192.168.0.105/api','http://192.168.0.105/api?token=x','http://192.168.0.105/api#x'])check(()=>assert.throws(()=>inspectEndpoint(value,'lan')));
check(()=>assert.throws(()=>inspectEndpoint('http://192.168.0.105:8080/api','lan','production')));
check(()=>assert.throws(()=>inspectEndpoint('http://192.168.0.105:8080/api')));
check(()=>{const xml=networkXml('192.168.0.105');assert.ok(xml.includes('base-config cleartextTrafficPermitted="false"'));assert.ok(xml.includes('<domain includeSubdomains="false">192.168.0.105</domain>'));assert.equal((xml.match(/<domain /g)||[]).length,1);});
check(()=>assert.ok(!networkXml(null).includes('cleartextTrafficPermitted="true"')));
const old={...process.env};
try{
 process.env.EXPO_PUBLIC_DEMO_MODE='lan';process.env.EXPO_PUBLIC_API_URL='http://192.168.0.105:8080/api';process.env.EAS_BUILD_PROFILE='preview-lan';
 check(()=>{const c=app({config:base});assert.equal(c.name,'ShiftSync Demo');assert.equal(c.extra.demoLanHost,'192.168.0.105');assert.equal(c.ios.infoPlist.NSAppTransportSecurity.NSAllowsLocalNetworking,true);});
 process.env.EXPO_PUBLIC_DEMO_MODE='';
 check(()=>{const c=app({config:base});assert.equal(c.name,base.name);assert.equal(c.extra.demoLanHost,null);assert.equal(c.ios.infoPlist.NSAppTransportSecurity?.NSAllowsLocalNetworking,undefined);});
}finally{for(const k of ['EXPO_PUBLIC_DEMO_MODE','EXPO_PUBLIC_API_URL','EAS_BUILD_PROFILE'])if(old[k]==null)delete process.env[k];else process.env[k]=old[k];}
console.log(checks+' LAN demo configuration checks passed.');
