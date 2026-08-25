$file = "src/main/java/com/shiftsync/workforce/controller/WorkforceRequestController.java"
$content = Get-Content $file -Raw
$content = $content -replace "hasAuthority\('ADMIN'\)", "hasRole('ADMIN')"
$content = $content -replace "hasAuthority\('MANAGER'\)", "hasRole('MANAGER')"
Set-Content -Path $file -Value $content

$file2 = "src/main/java/com/shiftsync/workforce/controller/WorkforceProposalController.java"
$content2 = Get-Content $file2 -Raw
$content2 = $content2 -replace "hasAuthority\('STAFF'\)", "hasRole('STAFF')"
Set-Content -Path $file2 -Value $content2
