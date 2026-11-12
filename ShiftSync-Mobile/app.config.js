const {inspectEndpoint}=require('./scripts/demo-endpoint.cjs');
module.exports=({config})=>{
  const lan=process.env.EXPO_PUBLIC_DEMO_MODE==='lan';
  const endpoint=lan?inspectEndpoint(process.env.EXPO_PUBLIC_API_URL,'lan',process.env.EAS_BUILD_PROFILE):null;
  return {
    ...config,
    name:lan?'ShiftSync Demo':config.name,
    extra:{...config.extra,demoMode:lan?'lan':null,demoLanHost:endpoint?.host||null},
    plugins:[...(config.plugins||[]),'expo-sharing','./plugins/withLanDemo.cjs'],
    ios:{...config.ios,infoPlist:{...config.ios?.infoPlist,...(lan?{
      NSLocalNetworkUsageDescription:'ShiftSync Demo kết nối với máy tính trong cùng Wi-Fi để tải lịch làm và chấm công.',
      NSAppTransportSecurity:{...config.ios?.infoPlist?.NSAppTransportSecurity,NSAllowsLocalNetworking:true},
    }:{})}},
  };
};
