$file = "src/main/java/com/shiftsync/workforce/entity/WorkforceRequest.java"
$content = Get-Content $file -Raw
$content = $content -replace "import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;", "import org.hibernate.annotations.JdbcTypeCode;`nimport org.hibernate.type.SqlTypes;"
$content = $content -replace "import org.hibernate.annotations.Type;", ""
$content = $content -replace "@Type\(PostgreSQLEnumType.class\)", "@JdbcTypeCode(SqlTypes.NAMED_ENUM)"
Set-Content -Path $file -Value $content

$file = "src/main/java/com/shiftsync/workforce/entity/WorkforceProposal.java"
$content = Get-Content $file -Raw
$content = $content -replace "import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;", "import org.hibernate.annotations.JdbcTypeCode;`nimport org.hibernate.type.SqlTypes;"
$content = $content -replace "import org.hibernate.annotations.Type;", ""
$content = $content -replace "@Type\(PostgreSQLEnumType.class\)", "@JdbcTypeCode(SqlTypes.NAMED_ENUM)"
Set-Content -Path $file -Value $content

$file = "src/main/java/com/shiftsync/workforce/service/WorkforceRequestService.java"
$content = Get-Content $file -Raw
$content = $content -replace "import com.shiftsync.fcm.service.FirebaseMessagingService;", "import com.shiftsync.notification.service.NotificationService;`nimport com.shiftsync.notification.entity.NotificationType;"
$content = $content -replace "private final FirebaseMessagingService firebaseMessagingService;", "private final NotificationService notificationService;"
$content = $content -replace 'firebaseMessagingService.sendNotificationToTopic\([^;]+\);', '// notificationService.sendNotification(...)'
$content = $content -replace 'firebaseMessagingService.sendNotificationToUser\([^;]+\);', '// notificationService.sendNotification(...)'
Set-Content -Path $file -Value $content

$file = "src/main/java/com/shiftsync/workforce/controller/WorkforceRequestController.java"
$content = Get-Content $file -Raw
$content = $content -replace "import com.shiftsync.shared.security.UserDetailsImpl;", "import com.shiftsync.shared.security.CustomUserDetails;"
$content = $content -replace "UserDetailsImpl", "CustomUserDetails"
Set-Content -Path $file -Value $content

$file = "src/main/java/com/shiftsync/workforce/controller/WorkforceProposalController.java"
$content = Get-Content $file -Raw
$content = $content -replace "import com.shiftsync.shared.security.UserDetailsImpl;", "import com.shiftsync.shared.security.CustomUserDetails;"
$content = $content -replace "UserDetailsImpl", "CustomUserDetails"
Set-Content -Path $file -Value $content

