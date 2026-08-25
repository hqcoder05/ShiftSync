$file = "src/main/java/com/shiftsync/workforce/controller/WorkforceRequestController.java"
$content = Get-Content $file -Raw
$content = $content -replace "@securityService.isManagerOfStore", "@storeAccessService.canAccessStore"
Set-Content -Path $file -Value $content

$file2 = "src/main/java/com/shiftsync/workforce/controller/WorkforceProposalController.java"
$content2 = Get-Content $file2 -Raw
$content2 = $content2 -replace "@securityService.isManagerOfStore", "@storeAccessService.canAccessStore"
Set-Content -Path $file2 -Value $content2
