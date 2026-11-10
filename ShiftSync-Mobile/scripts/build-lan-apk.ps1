param([string]$ComputerIp = '', [switch]$Online)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $projectRoot
try {
    if ($ComputerIp) { & node scripts/prepare-lan-demo.cjs $ComputerIp } else { & node scripts/prepare-lan-demo.cjs }
    if ($LASTEXITCODE -ne 0) { throw 'LAN preparation failed.' }
    $demo = Get-Content -LiteralPath '.expo/lan-demo-env.json' -Raw | ConvertFrom-Json
    $env:EXPO_PUBLIC_API_URL = $demo.EXPO_PUBLIC_API_URL
    $env:EXPO_PUBLIC_DEMO_MODE = 'lan'
    $env:EAS_BUILD_PROFILE = 'preview-lan'
    $env:EXPO_OFFLINE = '1'
    $env:NODE_ENV = 'production'
    $env:NODE_OPTIONS = '--max-old-space-size=2048'
    $env:CMAKE_BUILD_PARALLEL_LEVEL = '1'
    if (!$env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    if (!(Test-Path -LiteralPath $env:ANDROID_HOME)) { throw 'Android SDK not found. Set ANDROID_HOME.' }
    if (Test-Path -LiteralPath 'C:\Program Files\Java\jdk-21') { $env:JAVA_HOME = 'C:\Program Files\Java\jdk-21' }
    & node scripts/check-demo-config.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Invalid demo endpoint.' }
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
    Push-Location -LiteralPath (Join-Path $projectRoot 'android')
    try {
        $buildArgs = @(':app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a', '--no-daemon', '--max-workers=1',
            '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=768m -XX:ActiveProcessorCount=2',
            '-Pkotlin.compiler.execution.strategy=in-process', '--init-script', (Join-Path $PSScriptRoot 'limit-native-workers.gradle'), '--console=plain')
        if (!$Online) { $buildArgs += '--offline' }
        & .\gradlew.bat @buildArgs
        if ($LASTEXITCODE -ne 0) { throw 'APK build failed. See build log; use -Online only if Gradle dependencies are missing.' }
    } finally { Pop-Location }
    $artifactRoot = Join-Path $projectRoot 'output\android'
    New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
    $apk = Join-Path $artifactRoot ('ShiftSync-Demo-WiFi-arm64-' + (Get-Date -Format 'yyyy-MM-dd') + '.apk')
    Copy-Item -LiteralPath 'android/app/build/outputs/apk/release/app-release.apk' -Destination $apk -Force
    @{ apiUrl=$demo.EXPO_PUBLIC_API_URL; architecture='arm64-v8a'; build='local release, demo debug signing key';
        apk=$apk; sha256=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash; physicalDeviceTested=$false } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $artifactRoot 'lan-demo-build.json') -Encoding UTF8
    Write-Output "APK demo ready: $apk"
} finally { Pop-Location }
