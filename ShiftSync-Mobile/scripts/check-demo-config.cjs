const {inspectEndpoint}=require('./demo-endpoint.cjs');
try {
  const endpoint=inspectEndpoint(process.env.EXPO_PUBLIC_API_URL,process.env.EXPO_PUBLIC_DEMO_MODE,process.env.EAS_BUILD_PROFILE);
  console.log(`Standalone endpoint passed (${endpoint.lan?'LAN demo':'HTTPS'}).`);
}catch(error){console.error('Build stopped: '+error.message);process.exitCode=1;}
