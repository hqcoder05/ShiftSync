$ErrorActionPreference = 'Stop'
$backendPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../shiftsync-backend'))
$previousTemp = $env:TEMP
$previousTmp = $env:TMP

# Java trên Windows cần đường dẫn tạm ngắn, không chứa ký tự đặc biệt.
$env:TEMP = Join-Path $env:SystemRoot 'Temp'
$env:TMP = $env:TEMP
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

Push-Location -LiteralPath $backendPath
try {
    Write-Host 'Đang khởi chạy backend; log sẽ hiển thị trực tiếp tại console.'
    Write-Host 'Cấu hình được đọc từ biến môi trường và shiftsync-backend/.env. Nhấn Ctrl+C để dừng.'
    & .\mvnw.cmd spring-boot:run '-Dspring-boot.run.jvmArguments=-Dspring.devtools.restart.enabled=false -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8'
    if ($LASTEXITCODE -ne 0) { throw "Backend đã dừng với mã lỗi $LASTEXITCODE. Xem log phía trên." }
} finally {
    Pop-Location
    $env:TEMP = $previousTemp
    $env:TMP = $previousTmp
}
