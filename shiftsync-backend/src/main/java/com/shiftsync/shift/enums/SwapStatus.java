package com.shiftsync.shift.enums;

public enum SwapStatus {
    PENDING,
    APPROVED, // Manger approved
    REJECTED,
    CANCELLED,
    /** At least one shift started before the request was resolved. */
    EXPIRED
}
