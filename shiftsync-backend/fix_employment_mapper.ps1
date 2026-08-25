$file = "src\main\java\com\shiftsync\employment\mapper\EmploymentMapper.java"
$content = Get-Content $file -Raw
$content = $content -replace "import com.shiftsync.employment.dto.EmploymentDTO;`r?`n", "import com.shiftsync.employment.dto.EmploymentDTO;`r`nimport com.shiftsync.employment.dto.ContractTypeDTO;"
$content = $content -replace ".employmentType\(employment.getEmploymentType\(\)\)", ".contractType(employment.getContractType() != null ? ContractTypeDTO.builder().id(employment.getContractType().getId()).name(employment.getContractType().getName()).maxWeeklyHours(employment.getContractType().getMaxWeeklyHours()).otMultiplier(employment.getContractType().getOtMultiplier()).defaultHourlyRate(employment.getContractType().getDefaultHourlyRate()).build() : null)"
Set-Content $file -Value $content
