$file = "src\main\java\com\shiftsync\employment\dto\EmploymentCreateRequest.java"
$content = Get-Content $file -Raw
$content = $content -replace "import com.shiftsync.employment.enums.EmploymentType;`r?`n", ""
$content = $content -replace "private EmploymentType employmentType;", "private java.util.UUID contractTypeId;"
Set-Content $file -Value $content

$dtoFile = "src\main\java\com\shiftsync\employment\dto\EmploymentDTO.java"
$content2 = Get-Content $dtoFile -Raw
$content2 = $content2 -replace "import com.shiftsync.employment.enums.EmploymentType;`r?`n", ""
$content2 = $content2 -replace "private EmploymentType employmentType;", "private ContractTypeDTO contractType;"
Set-Content $dtoFile -Value $content2
