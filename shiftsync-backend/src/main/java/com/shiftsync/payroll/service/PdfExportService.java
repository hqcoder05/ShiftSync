package com.shiftsync.payroll.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfExportService {

    private final PayrollRepository payrollRepository;

    @Transactional(readOnly = true)
    public byte[] generatePayslipPdf(UUID payrollId, UUID staffId) {
        Payroll payroll = payrollRepository.findByIdAndStaffId(payrollId, staffId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll not found or access denied"));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Setup Unicode Font (Roboto-Regular)
            BaseFont baseFont = null;
            try {
                ClassPathResource fontResource = new ClassPathResource("fonts/Roboto-Regular.ttf");
                // IMPORTANT: When running from JAR, we need to read from stream or use absolute path if available.
                // iText allows using the font byte array. We will read the resource stream into a byte array.
                byte[] fontBytes = fontResource.getInputStream().readAllBytes();
                baseFont = BaseFont.createFont("Roboto-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontBytes, null);
            } catch (Exception e) {
                log.error("Could not load custom font, falling back to default", e);
            }

            Font titleFont = baseFont != null ? new Font(baseFont, 18, Font.BOLD) : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headerFont = baseFont != null ? new Font(baseFont, 12, Font.BOLD) : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font normalFont = baseFont != null ? new Font(baseFont, 12, Font.NORMAL) : FontFactory.getFont(FontFactory.HELVETICA, 12);

            // Title
            Paragraph title = new Paragraph("PAYSLIP", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Employee & Period Info
            document.add(new Paragraph("Employee: " + payroll.getStaff().getFullName(), headerFont));
            document.add(new Paragraph("Email: " + payroll.getStaff().getEmail(), normalFont));
            document.add(new Paragraph("Store: " + payroll.getPayrollPeriod().getStore().getName(), normalFont));
            document.add(new Paragraph("Period: " + payroll.getPayrollPeriod().getStartDate() + " to " + payroll.getPayrollPeriod().getEndDate(), normalFont));
            document.add(new Paragraph("Generated at: " + payroll.getGeneratedAt(), normalFont));
            
            document.add(new Paragraph(" ")); // Spacer

            // Table
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);
            table.setSpacingAfter(10f);

            // Table Headers
            String[] headers = {"Description", "Hours", "Rate", "Amount"};
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(5);
                table.addCell(cell);
            }

            // Normal Hours Row
            addTableRow(table, "Base Pay", payroll.getTotalHours().subtract(payroll.getOtHours()).subtract(payroll.getHolidayHours()), payroll.getBaseAmount(), normalFont);
            
            // OT Hours Row
            addTableRow(table, "Overtime Pay", payroll.getOtHours(), payroll.getOtAmount(), normalFont);
            
            // Holiday Hours Row
            addTableRow(table, "Holiday Pay", payroll.getHolidayHours(), payroll.getHolidayAmount(), normalFont);

            // Total Row
            PdfPCell totalDescCell = new PdfPCell(new Phrase("Total", headerFont));
            totalDescCell.setColspan(3);
            totalDescCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalDescCell.setPadding(5);
            table.addCell(totalDescCell);

            PdfPCell totalAmtCell = new PdfPCell(new Phrase("$" + payroll.getTotalAmount(), headerFont));
            totalAmtCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            totalAmtCell.setPadding(5);
            table.addCell(totalAmtCell);

            document.add(table);
            document.close();

            return baos.toByteArray();
        } catch (DocumentException | IOException e) {
            log.error("Error generating PDF", e);
            throw new RuntimeException("Could not generate PDF", e);
        }
    }

    private void addTableRow(PdfPTable table, String description, BigDecimal hours, BigDecimal amount, Font font) {
        PdfPCell cell1 = new PdfPCell(new Phrase(description, font));
        cell1.setPadding(5);
        table.addCell(cell1);

        PdfPCell cell2 = new PdfPCell(new Phrase(hours.toString(), font));
        cell2.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell2.setPadding(5);
        table.addCell(cell2);

        // Rate isn't explicitly stored per segment in Payroll entity, 
        // but we can just put a dash or calculate it if needed. Leaving as N/A.
        PdfPCell cell3 = new PdfPCell(new Phrase("N/A", font)); 
        cell3.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell3.setPadding(5);
        table.addCell(cell3);

        PdfPCell cell4 = new PdfPCell(new Phrase("$" + amount.toString(), font));
        cell4.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell4.setPadding(5);
        table.addCell(cell4);
    }
}
