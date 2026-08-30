package com.shiftsync.employment.service;

import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.dto.ContractTypeDTO;
import com.shiftsync.employment.repository.ContractTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ContractTypeServiceTest {

    @Mock
    private ContractTypeRepository contractTypeRepository;

    @Mock
    private com.shiftsync.employment.repository.EmploymentRepository employmentRepository;

    @InjectMocks
    private ContractTypeService contractTypeService;

    @Test
    void getContractTypes_ShouldReturnList() {
        UUID storeId = UUID.randomUUID();
        ContractType ct = new ContractType();
        ct.setId(UUID.randomUUID());
        ct.setName("FULL_TIME");
        when(contractTypeRepository.findByStoreId(storeId)).thenReturn(List.of(ct));

        List<ContractTypeDTO> result = contractTypeService.getContractTypes(storeId);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals("FULL_TIME", result.get(0).getName());
        verify(contractTypeRepository).findByStoreId(storeId);
    }

    @Test
    void deleteContractType_WhenInUse_ShouldThrowException() {
        UUID storeId = UUID.randomUUID();
        UUID contractTypeId = UUID.randomUUID();
        ContractType ct = new ContractType();
        ct.setId(contractTypeId);
        ct.setName("PART_TIME");

        when(contractTypeRepository.findByIdAndStoreId(contractTypeId, storeId)).thenReturn(java.util.Optional.of(ct));
        when(employmentRepository.countByStoreIdAndContractTypeId(storeId, contractTypeId)).thenReturn(1L);

        com.shiftsync.shared.exception.BusinessException exception = assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> {
            contractTypeService.deleteContractType(storeId, contractTypeId);
        });

        assertEquals("Cannot delete contract type that is in use by employees", exception.getMessage());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, exception.getStatus());
        
        verify(contractTypeRepository).findByIdAndStoreId(contractTypeId, storeId);
        verify(employmentRepository).countByStoreIdAndContractTypeId(storeId, contractTypeId);
        verify(contractTypeRepository, never()).delete(any(ContractType.class));
    }
}
