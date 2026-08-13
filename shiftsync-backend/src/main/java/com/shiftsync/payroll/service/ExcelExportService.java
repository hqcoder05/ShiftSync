package com.shiftsync.payroll.service;

import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.entity.PayrollPeriod;
import com.shiftsync.payroll.repository.PayrollPeriodRepository;
import com.shiftsync.payroll.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private final PayrollRepository payrollRepository;
    private final PayrollPeriodRepository payrollPeriodRepository;

    @Transactional(readOnly = true)
    public byte[] generatePayrollExcel(UUID periodId, UUID storeId) {
        // IDOR Check
        PayrollPeriod period = payrollPeriodRepository.findByIdAndStoreId(periodId, storeId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll Period not found or access denied"));

        List<Payroll> payslips = payrollRepository.findByPayrollPeriodId(periodId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Payroll Report");

            // Header Font & Style
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Currency Style
            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("#,##0.00"));
            currencyStyle.setBorderBottom(BorderStyle.THIN);
            currencyStyle.setBorderTop(BorderStyle.THIN);
            currencyStyle.setBorderRight(BorderStyle.THIN);
            currencyStyle.setBorderLeft(BorderStyle.THIN);

            // Normal Style
            CellStyle normalStyle = workbook.createCellStyle();
            normalStyle.setBorderBottom(BorderStyle.THIN);
            normalStyle.setBorderTop(BorderStyle.THIN);
            normalStyle.setBorderRight(BorderStyle.THIN);
            normalStyle.setBorderLeft(BorderStyle.THIN);
            normalStyle.setAlignment(HorizontalAlignment.CENTER);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            String[] columns = {"STT", "Employee ID", "Employee Name", "Email", "Total Hours", "Base Pay", "OT Pay", "Holiday Pay", "Total Amount"};
            
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Fill Data
            int rowNum = 1;
            for (Payroll p : payslips) {
                Row row = sheet.createRow(rowNum++);
                
                createCell(row, 0, String.valueOf(rowNum - 1), normalStyle);
                createCell(row, 1, p.getStaff().getId().toString(), normalStyle);
                createCell(row, 2, p.getStaff().getFullName(), normalStyle);
                createCell(row, 3, p.getStaff().getEmail(), normalStyle);
                createCell(row, 4, p.getTotalHours().doubleValue(), normalStyle); // Numbers for hours
                createCell(row, 5, p.getBaseAmount(), currencyStyle);
                createCell(row, 6, p.getOtAmount(), currencyStyle);
                createCell(row, 7, p.getHolidayAmount(), currencyStyle);
                createCell(row, 8, p.getTotalAmount(), currencyStyle);
            }

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();
            
        } catch (IOException e) {
            log.error("Failed to generate Excel file", e);
            throw new RuntimeException("Error generating Excel report", e);
        }
    }

    private void createCell(Row row, int colIndex, String value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private void createCell(Row row, int colIndex, double value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
    
    private void createCell(Row row, int colIndex, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value != null ? value.doubleValue() : 0.0);
        cell.setCellStyle(style);
    }
}
