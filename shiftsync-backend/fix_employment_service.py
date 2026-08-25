import os

path = "src/main/java/com/shiftsync/employment/service/EmploymentService.java"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add ContractTypeRepository import
content = content.replace(
    "import com.shiftsync.store.repository.StoreRepository;",
    "import com.shiftsync.store.repository.StoreRepository;\nimport com.shiftsync.employment.repository.ContractTypeRepository;\nimport com.shiftsync.employment.entity.ContractType;"
)

# Add ContractTypeRepository field
content = content.replace(
    "private final StoreRepository storeRepository;",
    "private final StoreRepository storeRepository;\n    private final ContractTypeRepository contractTypeRepository;"
)

content = content.replace(
    "public EmploymentService(EmploymentRepository employmentRepository, UserRepository userRepository, StoreRepository storeRepository)",
    "public EmploymentService(EmploymentRepository employmentRepository, UserRepository userRepository, StoreRepository storeRepository, ContractTypeRepository contractTypeRepository)"
)

content = content.replace(
    "this.storeRepository = storeRepository;",
    "this.storeRepository = storeRepository;\n        this.contractTypeRepository = contractTypeRepository;"
)

# Fix createEmployment
content = content.replace(
    "employment.setEmploymentType(request.getEmploymentType());",
    """ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));
        employment.setContractType(contractType);
        
        if (request.getHourlyRate() == null) {
            employment.setHourlyRate(contractType.getDefaultHourlyRate());
        }"""
)

# Fix updateEmployment
content = content.replace(
    "employment.setEmploymentType(request.getEmploymentType());",
    """ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new BusinessException("Contract type not found", HttpStatus.NOT_FOUND));
        employment.setContractType(contractType);
        
        if (request.getHourlyRate() == null) {
            employment.setHourlyRate(contractType.getDefaultHourlyRate());
        }"""
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
