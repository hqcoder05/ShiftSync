package com.shiftsync.activity;
import java.util.List;
public record ActivityPage(List<ActivityItem> items, String nextCursor) { }
