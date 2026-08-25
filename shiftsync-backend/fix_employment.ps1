$file = "src\main\java\com\shiftsync\employment\entity\Employment.java"
$content = Get-Content $file -Raw
$content = $content -replace "import com.shiftsync.employment.enums.EmploymentType;`r?`n", ""
$content = $content -replace "@Enumerated\(EnumType.STRING\)`r?`n\s*@JdbcTypeCode\(SqlTypes.NAMED_ENUM\)`r?`n\s*@Column\(name = `"employment_type`", nullable = false\)`r?`n\s*private EmploymentType employmentType;", "@ManyToOne(fetch = FetchType.LAZY)`r`n    @JoinColumn(name = `"contract_type_id`", nullable = false)`r`n    private ContractType contractType;"
Set-Content $file -Value $content
