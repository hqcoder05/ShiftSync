package com.shiftsync.leave.enums;

import lombok.Getter;

@Getter
public enum LeaveType {
    SICK("Nghỉ ốm", "Nghỉ do lý do sức khỏe/ốm đau theo chế độ bảo hiểm xã hội, không trừ quỹ phép năm.", true, false),
    ANNUAL("Nghỉ phép năm", "Nghỉ phép theo chế độ hàng năm, hưởng nguyên lương và khấu trừ vào quỹ phép năm.", true, true),
    EMERGENCY("Nghỉ khẩn cấp", "Nghỉ việc khẩn cấp phát sinh đột xuất, không trừ quỹ phép năm.", false, false),
    UNPAID("Nghỉ không lương", "Nghỉ việc riêng không hưởng lương theo thỏa thuận, không trừ quỹ phép năm.", false, false),
    PERSONAL("Nghỉ việc riêng", "Nghỉ việc riêng (kết hôn, tang lễ,...) theo quy định Bộ luật Lao động, hưởng nguyên lương.", true, false),
    OTHER("Nghỉ khác", "Nghỉ theo các trường hợp đặc thù khác, không trừ quỹ phép năm.", false, false);

    private final String displayName;
    private final String description;
    private final boolean paid;
    private final boolean deductsAnnualBalance;

    LeaveType(String displayName, String description, boolean paid, boolean deductsAnnualBalance) {
        this.displayName = displayName;
        this.description = description;
        this.paid = paid;
        this.deductsAnnualBalance = deductsAnnualBalance;
    }

    public boolean isPaid() {
        return paid;
    }

    public boolean isDeductsAnnualBalance() {
        return deductsAnnualBalance;
    }
}

