package com.shiftsync.payroll.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.shiftsync.payroll.entity.Payroll;
import com.shiftsync.payroll.repository.PayrollRepository;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.StoreAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfExportService {

    private final PayrollRepository payrollRepository;
    private final StoreAccessService storeAccessService;

    @Transactional(readOnly = true)
    public byte[] generatePayslipPdf(UUID payrollId, CustomUserDetails userDetails, Authentication auth) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll not found"));

        boolean isOwner = userDetails != null && payroll.getStaff().getId().equals(userDetails.getId());
        boolean hasStoreAccess = auth != null && storeAccessService.canAccessStore(auth, payroll.getPayrollPeriod().getStore().getId());

        if (!isOwner && !hasStoreAccess) {
            throw new IllegalArgumentException("Payroll not found or access denied");
        }

        return buildPdf(payroll);
    }

    @Transactional(readOnly = true)
    public byte[] generatePayslipPdf(UUID payrollId, UUID staffId) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll not found"));

        if (!payroll.getStaff().getId().equals(staffId)) {
            throw new IllegalArgumentException("Payroll not found or access denied");
        }

        return buildPdf(payroll);
    }

    private byte[] buildPdf(Payroll payroll) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Setup Unicode Font (Roboto-Regular)
            BaseFont baseFont = null;
            try {
                ClassPathResource fontResource = new ClassPathResource("fonts/Roboto-Regular.ttf");
                byte[] fontBytes = fontResource.getInputStream().readAllBytes();
                baseFont = BaseFont.createFont("Roboto-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontBytes, null);
            } catch (Exception e) {
                log.error("Could not load custom font, falling back to default", e);
            }

            Font titleFont = baseFont != null ? new Font(baseFont, 18, Font.BOLD) : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headerFont = baseFont != null ? new Font(baseFont, 12, Font.BOLD) : FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font normalFont = baseFont != null ? new Font(baseFont, 12, Font.NORMAL) : FontFactory.getFont(FontFactory.HELVETICA, 12);

            // Title
            Paragraph title = new Paragraph("PHIẾU LƯƠNG / PAYSLIP", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Employee & Period Info
            document.add(new Paragraph("Nhân viên / Employee: " + payroll.getStaff().getFullName(), headerFont));
            document.add(new Paragraph("Email: " + payroll.getStaff().getEmail(), normalFont));
            document.add(new Paragraph("Chi nhánh / Store: " + payroll.getPayrollPeriod().getStore().getName(), normalFont));
            document.add(new Paragraph("Kỳ lương / Period: " + payroll.getPayrollPeriod().getStartDate() + " – " + payroll.getPayrollPeriod().getEndDate(), normalFont));
            document.add(new Paragraph("Ngày tạo / Generated: " + (payroll.getGeneratedAt() != null ? payroll.getGeneratedAt() : "—"), normalFont));
            
            document.add(new Paragraph(" ")); // Spacer

            // Table
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);
            table.setSpacingAfter(10f);

            // Table Headers
            String[] headers = {"Hạng mục / Item", "Số giờ / Hours", "Mức lương / Rate", "Thành tiền / Amount"};
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            BigDecimal totalHours = payroll.getTotalHours() != null ? payroll.getTotalHours() : BigDecimal.ZERO;
            BigDecimal otHours = payroll.getOtHours() != null ? payroll.getOtHours() : BigDecimal.ZERO;
            BigDecimal holidayHours = payroll.getHolidayHours() != null ? payroll.getHolidayHours() : BigDecimal.ZERO;
            BigDecimal normalHours = totalHours.subtract(otHours).subtract(holidayHours);
            if (normalHours.compareTo(BigDecimal.ZERO) < 0) {
                normalHours = BigDecimal.ZERO;
            }

            BigDecimal baseAmount = payroll.getBaseAmount() != null ? payroll.getBaseAmount() : BigDecimal.ZERO;
            BigDecimal otAmount = payroll.getOtAmount() != null ? payroll.getOtAmount() : BigDecimal.ZERO;
            BigDecimal holidayAmount = payroll.getHolidayAmount() != null ? payroll.getHolidayAmount() : BigDecimal.ZERO;
            BigDecimal totalAmount = payroll.getTotalAmount() != null ? payroll.getTotalAmount() : BigDecimal.ZERO;

            // Normal Hours Row
            addTableRow(table, "Lương cơ bản (Base Pay)", normalHours, baseAmount, normalFont);
            
            // OT Hours Row
            addTableRow(table, "Lương tăng ca (Overtime)", otHours, otAmount, normalFont);
            
            // Holiday Hours Row
            addTableRow(table, "Lương lễ/thưởng (Holiday)", holidayHours, holidayAmount, normalFont);

            // Total Row
            PdfPCell totalDescCell = new PdfPCell(new Phrase("Tổng cộng / Total", headerFont));
            totalDescCell.setColspan(3);
            totalDescCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalDescCell.setPadding(6);
            table.addCell(totalDescCell);

            PdfPCell totalAmtCell = new PdfPCell(new Phrase(formatVND(totalAmount), headerFont));
            totalAmtCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalAmtCell.setPadding(6);
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
        cell1.setPadding(6);
        table.addCell(cell1);

        PdfPCell cell2 = new PdfPCell(new Phrase(formatHours(hours), font));
        cell2.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell2.setPadding(6);
        table.addCell(cell2);

        String rateStr = (hours != null && hours.compareTo(BigDecimal.ZERO) > 0 && amount != null && amount.compareTo(BigDecimal.ZERO) > 0)
                ? formatVND(amount.divide(hours, 0, RoundingMode.HALF_UP)) + "/h"
                : "—";
        PdfPCell cell3 = new PdfPCell(new Phrase(rateStr, font));
        cell3.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell3.setPadding(6);
        table.addCell(cell3);

        PdfPCell cell4 = new PdfPCell(new Phrase(formatVND(amount), font));
        cell4.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cell4.setPadding(6);
        table.addCell(cell4);
    }

    private String formatVND(BigDecimal amount) {
        if (amount == null) return "0đ";
        long val = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        return NumberFormat.getInstance(Locale.forLanguageTag("vi-VN")).format(val) + "đ";
    }

    private String formatHours(BigDecimal hours) {
        if (hours == null) return "0.00h";
        return hours.setScale(2, RoundingMode.HALF_UP).toString() + "h";
    }
}
