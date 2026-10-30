const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const toChartISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mondayOf = (date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0, 12);

export function getChartRange(anchor, period) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  if (period === "week") {
    const start = mondayOf(anchor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  if (period === "month") {
    return { start: new Date(year, month, 1, 12), end: lastDayOfMonth(year, month) };
  }
  if (period === "quarter") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      start: new Date(year, quarterStartMonth, 1, 12),
      end: lastDayOfMonth(year, quarterStartMonth + 2),
    };
  }
  return { start: new Date(year, 0, 1, 12), end: new Date(year, 11, 31, 12) };
}

export function getChartBuckets(anchor, period) {
  const { start, end } = getChartRange(anchor, period);
  const buckets = [];

  if (period === "week") {
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const day = new Date(date);
      buckets.push({ start: day, end: day, day, isAnchor: toChartISO(anchor) === toChartISO(day), label: `${WEEKDAY_SHORT[day.getDay()]} ${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}` });
    }
    return buckets;
  }

  if (period === "month") {
    let bucketStart = new Date(start);
    let week = 1;
    while (bucketStart <= end) {
      const daysUntilSunday = 6 - bucketStart.getDay();
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + daysUntilSunday);
      if (bucketEnd > end) bucketEnd.setTime(end.getTime());
      buckets.push({ start: new Date(bucketStart), end: new Date(bucketEnd), day: new Date(bucketStart), isAnchor: anchor >= bucketStart && anchor <= bucketEnd, label: `Tuần ${week}` });
      bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketStart.getDate() + 1);
      week += 1;
    }
    return buckets;
  }

  const monthCount = period === "quarter" ? 3 : 12;
  const firstMonth = period === "quarter" ? Math.floor(anchor.getMonth() / 3) * 3 : 0;
  for (let offset = 0; offset < monthCount; offset += 1) {
    const month = firstMonth + offset;
    const bucketStart = new Date(anchor.getFullYear(), month, 1, 12);
    const bucketEnd = lastDayOfMonth(anchor.getFullYear(), month);
    const monthLabel = `T${String(month + 1).padStart(2, "0")}`;
    buckets.push({ start: bucketStart, end: bucketEnd, day: bucketStart, isAnchor: anchor.getFullYear() === bucketStart.getFullYear() && anchor.getMonth() === bucketStart.getMonth(), label: monthLabel });
  }
  return buckets;
}

export function formatChartRange(anchor, period) {
  const year = anchor.getFullYear();
  if (period === "month") return `Tháng ${anchor.getMonth() + 1}/${year}`;
  if (period === "quarter") return `Quý ${Math.floor(anchor.getMonth() / 3) + 1}/${year}`;
  if (period === "year") return `Năm ${year}`;
  const { start, end } = getChartRange(anchor, period);
  const fmt = (date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  return start.getFullYear() === end.getFullYear()
    ? `${fmt(start)}–${fmt(end)}/${year}`
    : `${fmt(start)}/${start.getFullYear()}–${fmt(end)}/${end.getFullYear()}`;
}

export function shiftChartAnchor(anchor, period, amount) {
  const next = new Date(anchor);
  if (period === "week") next.setDate(next.getDate() + amount * 7);
  else {
    const targetMonth = next.getMonth() + (period === "month" ? amount : period === "quarter" ? amount * 3 : amount * 12);
    const dayOfMonth = next.getDate();
    next.setDate(1);
    next.setMonth(targetMonth);
    next.setDate(Math.min(dayOfMonth, lastDayOfMonth(next.getFullYear(), next.getMonth()).getDate()));
  }
  return next;
}
