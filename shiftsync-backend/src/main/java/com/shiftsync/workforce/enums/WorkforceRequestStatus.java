package com.shiftsync.workforce.enums;

public enum WorkforceRequestStatus {
    PENDING,
    MANAGER_REJECTED,
    PROPOSAL_SENT,
    COMPLETED,
    CANCELLED,
    /** The requested shift has started before workforce coordination completed. */
    EXPIRED
}
