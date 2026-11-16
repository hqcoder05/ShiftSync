export function isOneWayGiveaway(swap) {
  return !swap?.toShiftId;
}

function shiftHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = String(startTime).slice(0, 5).split(':').map(Number);
  const [eh, em] = String(endTime).slice(0, 5).split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return null;
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

function fmtHours(hours) {
  if (hours == null) return '';
  return `${Number.isInteger(hours) ? hours : Number(hours.toFixed(1))}h`;
}

function fmtVnd(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  const n = Math.round(Number(amount));
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${n.toLocaleString('vi-VN')}đ`;
}

export function formatSwapQuickTitle(swap) {
  const fromName = swap?.fromStaffName || 'Nhân viên';
  return isOneWayGiveaway(swap)
    ? `[Nhường ca 1 chiều] ${fromName}`
    : `[Đổi ca 2 chiều] ${fromName}`;
}

export function formatSwapQuickSubtitle(swap) {
  const oneWay = isOneWayGiveaway(swap);
  const toName = swap?.toStaffName || 'đồng nghiệp';
  const fromH = shiftHours(swap?.fromShiftStartTime, swap?.fromShiftEndTime);
  const toH = oneWay ? null : shiftHours(swap?.toShiftStartTime, swap?.toShiftEndTime);

  const parts = [];
  parts.push(
    oneWay
      ? `Ca ${swap?.fromShiftDate || 'sắp tới'} → ${toName}`
      : `Ca ${swap?.fromShiftDate || 'sắp tới'} ↔ ${toName} (${swap?.toShiftDate || 'sắp tới'})`
  );

  if (fromH != null) {
    if (oneWay) {
      parts.push(`${fmtHours(fromH)} (1 chiều)`);
    } else if (toH != null) {
      const diff = toH - fromH;
      const diffText = diff === 0 ? 'Bằng giờ' : `${diff > 0 ? '+' : ''}${fmtHours(diff)}`;
      parts.push(`${fmtHours(fromH)} ↔ ${fmtHours(toH)} (${diffText})`);
    }
  }

  if (swap?.fromShiftRoleName || swap?.toShiftRoleName) {
    parts.push(
      oneWay
        ? `Vị trí: ${swap.fromShiftRoleName || 'Ca nhường'}`
        : `Vị trí: ${swap.fromShiftRoleName || 'Ca gốc'} ↔ ${swap.toShiftRoleName || 'Ca đổi'}`
    );
  }

  const costText = fmtVnd(swap?.storeLaborCostDelta);
  if (costText) {
    parts.push(`Chi phí ca: ${costText}`);
  }

  if (!swap?.employeeAccepted) {
    parts.push('Chờ đồng nghiệp đồng ý');
  }

  return parts.join(' • ');
}
