package com.shiftsync.store.service;

import com.shiftsync.store.entity.Store;
import java.time.LocalTime;

/** Local intervals shorter than 24 hours, with an end before the start crossing midnight. */
public final class OperatingHours {
    private static final long DAY = 24L * 60 * 60 * 1_000_000_000;
    private OperatingHours() {}

    public static boolean contains(Store store, LocalTime start, LocalTime end) {
        if (start == null || end == null || start.equals(end)) return false;
        if (store == null || store.getOpenTime() == null || store.getCloseTime() == null) return true;
        long open = store.getOpenTime().toNanoOfDay(), close = store.getCloseTime().toNanoOfDay();
        long window = Math.floorMod(close - open, DAY);
        if (window == 0) return false;
        long offset = Math.floorMod(start.toNanoOfDay() - open, DAY);
        long length = Math.floorMod(end.toNanoOfDay() - start.toNanoOfDay(), DAY);
        return offset < window && offset + length <= window;
    }
}
