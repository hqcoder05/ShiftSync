import sys
import re

file_path = 'src/main/java/com/shiftsync/payroll/controller/PayrollController.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import com.shiftsync.payroll.dto.PayrollPeriodStatusUpdateRequest;\nimport com.shiftsync.payroll.enums.PayrollPeriodStatus;\n"
if "PayrollPeriodStatusUpdateRequest" not in content:
    content = content.replace("import com.shiftsync.payroll.dto.PayrollGenerateRequest;", import_statement + "import com.shiftsync.payroll.dto.PayrollGenerateRequest;")

method_code = '''
    @Operation(summary = "Update payroll period status")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/stores/{storeId}/payroll/{periodId}/status")
    public ResponseEntity<Void> updatePayrollPeriodStatus(
            @PathVariable UUID storeId,
            @PathVariable UUID periodId,
            @Valid @RequestBody PayrollPeriodStatusUpdateRequest request) {
        payrollCalculationService.updatePayrollPeriodStatus(storeId, periodId, request.getStatus());
        return ResponseEntity.ok().build();
    }
'''

last_brace_index = content.rfind('}')
if last_brace_index != -1:
    new_content = content[:last_brace_index] + method_code + '\n}\n'
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added updatePayrollPeriodStatus to PayrollController")
else:
    print("Could not find closing brace")
