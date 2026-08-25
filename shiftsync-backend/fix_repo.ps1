$file = "src/main/java/com/shiftsync/notification/repository/UserDeviceTokenRepository.java"
$content = Get-Content $file -Raw
$content = $content -replace "void deleteByFcmToken", "@org.springframework.transaction.annotation.Transactional`n    void deleteByFcmToken"
Set-Content -Path $file -Value $content
