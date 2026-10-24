import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Dashboard from "../components/dashboard/Dashboard";
import { DEFAULT_POSITION_COLORS } from "../components/dashboard/types";
import { getAllStores } from "../services/storeService";
import { getEmployees } from "../services/employeeService";
import { getShiftsForStore } from "../services/shiftService";
import { getStoreAttendance } from "../services/attendanceService";
import { getSkillsByStore } from "../services/skillService";
import { getRequests, updateRequestStatus } from "../services/requestService";
import { getStoreLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "../services/leaveService";
import { getStoreSwapRequests, approveSwapRequest, rejectSwapRequest } from "../services/swapService";
import { getStoreAdjustmentRequests, approveAdjustmentRequest, rejectAdjustmentRequest } from "../services/adjustmentService";
import { getStoreLayout, getStoreZones } from "../services/layoutService";
import { getAvatarForEmployee } from "../components/avatarConfigs";
import { toast } from "../context/ToastContext";

const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function parseHour(timeStr, defaultHour = 6) {
  if (!timeStr) return defaultHour;
  if (typeof timeStr === "number") return timeStr;
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? defaultHour : d.getHours() + d.getMinutes() / 60;
  }
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  return isNaN(h) ? defaultHour : h + m / 60;
}

function resolvePositionId(shift, assign, positions) {
  const candidate = (
    assign?.skillName ||
    assign?.skill?.name ||
    shift?.skillName ||
    assign?.zoneName ||
    shift?.zoneName ||
    ""
  ).toLowerCase().trim();

  if (candidate) {
    const found = positions.find((p) => {
      const pName = p.name.toLowerCase().trim();
      return candidate.includes(pName) || pName.includes(candidate);
    });
    if (found) return found.id;
  }
  return positions[0]?.id || "default";
}

export default function DashboardPage() {
  const [date, setDate] = useState(() => new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState(() => localStorage.getItem("selectedStoreId") || "");
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [storeSkills, setStoreSkills] = useState([]);
  const [storeLayout, setStoreLayout] = useState({ length: 24, width: 16, height: 5 });
  const [storeZones, setStoreZones] = useState([]);
  const [generalRequests, setGeneralRequests] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [pendingSwap, setPendingSwap] = useState([]);
  const [pendingAdj, setPendingAdj] = useState([]);
  const [dataLoadErrors, setDataLoadErrors] = useState([]);

  // In-flight mutation guard for optimistic updates
  const mutatingRef = useRef(false);

  // 1. Load Stores
  useEffect(() => {
    let isMounted = true;
    getAllStores()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        if (list && list.length > 0) {
          setStores(list);
          const saved = localStorage.getItem("selectedStoreId");
          const target = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setSelectedStoreId(String(target.id));
          localStorage.setItem("selectedStoreId", String(target.id));
        }
      })
      .catch((err) => console.info("Dashboard store fetch info:", err.message));
    return () => { isMounted = false; };
  }, []);

  // 2. Load Employees, Skills, Layout & Zones for the Store
  useEffect(() => {
    if (!selectedStoreId) return;

    let cancelled = false;
    Promise.allSettled([
      getEmployees(), getSkillsByStore(selectedStoreId), getStoreLayout(selectedStoreId), getStoreZones(selectedStoreId),
    ]).then(([employeeRes, skillRes, layoutRes, zoneRes]) => {
      if (cancelled) return;
      const failures = [];
      if (employeeRes.status === 'fulfilled') {
        const list = Array.isArray(employeeRes.value.data) ? employeeRes.value.data : (employeeRes.value.data?.content || []);
        setEmployees(list || []);
      } else failures.push('nhân sự');
      if (skillRes.status === 'fulfilled') {
        const list = Array.isArray(skillRes.value.data) ? skillRes.value.data : (skillRes.value.data?.content || []);
        setStoreSkills(list || []);
      } else failures.push('vị trí/kỹ năng');
      if (layoutRes.status === 'fulfilled' && layoutRes.value?.data) setStoreLayout(layoutRes.value.data);
      else if (layoutRes.status === 'rejected') failures.push('sơ đồ cửa hàng');
      if (zoneRes.status === 'fulfilled') {
        const list = Array.isArray(zoneRes.value?.data) ? zoneRes.value.data : (zoneRes.value?.data?.content || []);
        setStoreZones(list || []);
      } else failures.push('khu vực');
      setDataLoadErrors(failures);
    });
    return () => { cancelled = true; };
  }, [selectedStoreId]);

  // 3. Load Live Shifts, Attendance, and Requests
  const reloadLiveData = useCallback(async () => {
    if (!selectedStoreId || mutatingRef.current) return;
    try {
      const [shiftRes, attRes, reqRes, leaveRes, swapRes, adjRes] = await Promise.allSettled([
        getShiftsForStore(selectedStoreId),
        getStoreAttendance(selectedStoreId),
        getRequests(),
        getStoreLeaveRequests(selectedStoreId, "PENDING"),
        getStoreSwapRequests(selectedStoreId, "PENDING"),
        getStoreAdjustmentRequests(selectedStoreId, "PENDING"),
      ]);

      const failures = [];
      if (shiftRes.status === "fulfilled") {
        const d = Array.isArray(shiftRes.value.data) ? shiftRes.value.data : (shiftRes.value.data?.content || []);
        setShifts(d);
      } else failures.push('lịch làm việc');
      if (attRes.status === "fulfilled") {
        const d = Array.isArray(attRes.value.data) ? attRes.value.data : (attRes.value.data?.content || []);
        setAttendanceList(d);
      } else failures.push('chấm công');
      if (reqRes.status === "fulfilled") {
        setGeneralRequests(reqRes.value || []);
      } else failures.push('yêu cầu');
      if (leaveRes.status === "fulfilled") {
        const d = Array.isArray(leaveRes.value.data) ? leaveRes.value.data : (leaveRes.value.data?.content || []);
        setPendingLeave(d);
      } else failures.push('nghỉ phép');
      if (swapRes.status === "fulfilled") {
        const d = Array.isArray(swapRes.value.data) ? swapRes.value.data : (swapRes.value.data?.content || []);
        setPendingSwap(d);
      } else failures.push('đổi ca');
      if (adjRes.status === "fulfilled") {
        const d = Array.isArray(adjRes.value.data) ? adjRes.value.data : (adjRes.value.data?.content || []);
        setPendingAdj(d);
      } else failures.push('giải trình');
      setDataLoadErrors((current) => [...new Set([...current.filter((item) => !['lịch làm việc', 'chấm công', 'yêu cầu', 'nghỉ phép', 'đổi ca', 'giải trình'].includes(item)), ...failures])]);
    } catch (err) {
      console.warn("Error reloading dashboard live data:", err);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    reloadLiveData();
  }, [reloadLiveData]);

  // Realtime WebSocket & Storage listeners
  useEffect(() => {
    window.addEventListener("store_shifts_updated", reloadLiveData);
    window.addEventListener("store_attendance_updated", reloadLiveData);
    window.addEventListener("store_requests_updated", reloadLiveData);
    window.addEventListener("notification_received", reloadLiveData);
    return () => {
      window.removeEventListener("store_shifts_updated", reloadLiveData);
      window.removeEventListener("store_attendance_updated", reloadLiveData);
      window.removeEventListener("store_requests_updated", reloadLiveData);
      window.removeEventListener("notification_received", reloadLiveData);
    };
  }, [reloadLiveData]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "selectedStoreId" && e.newValue) {
        setSelectedStoreId(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // 4. Transform Positions
  const positions = useMemo(() => {
    if (storeSkills.length > 0) {
      return storeSkills.map((sk, i) => ({
        id: String(sk.id || sk.name).toLowerCase(),
        name: sk.name,
        color: (sk.description && sk.description.startsWith("#"))
          ? sk.description
          : DEFAULT_POSITION_COLORS[i % DEFAULT_POSITION_COLORS.length],
      }));
    }
    return [
      { id: "barista", name: "Pha chế", color: DEFAULT_POSITION_COLORS[0] },
      { id: "cashier", name: "Thu ngân", color: DEFAULT_POSITION_COLORS[1] },
      { id: "waiter", name: "Phục vụ", color: DEFAULT_POSITION_COLORS[2] },
      { id: "kitchen", name: "Bếp", color: DEFAULT_POSITION_COLORS[3] },
    ];
  }, [storeSkills]);

  // 5. Employee List for Filter
  const employeesList = useMemo(() => {
    return employees.map((e) => ({
      id: String(e.id || e.staffId),
      name: e.fullName || e.name || e.employeeName || "Nhân viên",
    }));
  }, [employees]);

  const selectedEmp = useMemo(() => {
    return employeeId ? employeesList.find((e) => e.id === employeeId) : null;
  }, [employeeId, employeesList]);

  // 6. Day Shifts for Timeline (Enriched with 3D Avatars)
  const dateISO = useMemo(() => fmtISO(date), [date]);

  const timelineShifts = useMemo(() => {
    const dayShifts = shifts.filter((s) => s.shiftDate === dateISO || s.date === dateISO);
    const rows = [];

    dayShifts.forEach((s) => {
      const start = parseHour(s.startTime, 7);
      const end = parseHour(s.endTime, 15);

      if (s.shiftAssignments && s.shiftAssignments.length > 0) {
        s.shiftAssignments.forEach((assign, aIdx) => {
          const empName = assign.staffName || assign.employeeName || assign.userFullName || "Nhân viên";
          const assignEmpId = String(assign.staffId || assign.employeeId || "");

          if (selectedEmp && empName !== selectedEmp.name && assignEmpId !== selectedEmp.id) {
            return;
          }

          rows.push({
            id: `assign-${s.id}-${aIdx}`,
            employee: empName,
            avatarId: assign.avatarId || getAvatarForEmployee(empName),
            positionId: resolvePositionId(s, assign, positions),
            start,
            end,
          });
        });
      } else {
        const empName = s.staffName || (s.isOpen ? "Ca trống" : "Chưa phân công");
        const shiftEmpId = String(s.staffId || "");

        if (selectedEmp && empName !== selectedEmp.name && shiftEmpId !== selectedEmp.id) {
          return;
        }

        rows.push({
          id: `shift-${s.id}`,
          employee: empName,
          avatarId: s.avatarId || (s.staffName ? getAvatarForEmployee(s.staffName) : null),
          positionId: resolvePositionId(s, null, positions),
          start,
          end,
        });
      }
    });

    return rows;
  }, [shifts, dateISO, selectedEmp, positions]);

  // 7. Attendance List for Date (Enriched with 3D Avatars & Semantic Status)
  const dayAttendance = useMemo(() => {
    let dayAtt = attendanceList.filter((a) => {
      const aDate = a.shiftDate || a.date || a.attendanceDate || (a.checkInTime ? fmtISO(new Date(a.checkInTime)) : "");
      return aDate === dateISO;
    });

    if (selectedEmp) {
      dayAtt = dayAtt.filter((a) => {
        const name = a.staffName || a.employeeName || "";
        const id = String(a.staffId || a.employeeId || "");
        return name === selectedEmp.name || id === selectedEmp.id;
      });
    }

    return dayAtt.map((a, idx) => {
      let action = "vào ca";
      let timeStr = "--:--";

      if (a.checkOutTime) {
        action = "tan ca";
        const t = new Date(a.checkOutTime);
        timeStr = !isNaN(t.getTime())
          ? t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          : (a.checkOutTime.slice(11, 16) || a.checkOutTime);
      } else if (a.checkInTime) {
        action = a.status === "LATE" ? "vào ca (trễ)" : "vào ca";
        const t = new Date(a.checkInTime);
        timeStr = !isNaN(t.getTime())
          ? t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          : (a.checkInTime.slice(11, 16) || a.checkInTime);
      } else if (a.status === "ABSENT") {
        action = "vắng mặt";
        timeStr = "N/A";
      }

      const empName = a.staffName || a.employeeName || "Nhân viên";

      return {
        id: a.id || `att-${idx}`,
        employee: empName,
        avatarId: a.avatarId || getAvatarForEmployee(empName),
        action,
        status: a.status || "PRESENT",
        time: timeStr,
      };
    });
  }, [attendanceList, dateISO, selectedEmp]);

  // 8. Pending Items for Optimistic Action Processing
  const detailedPendingItems = useMemo(() => {
    const list = [];

    pendingSwap.forEach((s) => {
      list.push({
        id: s.id,
        type: "swap",
        title: `${s.fromStaffName || "Nhân viên"} xin đổi ca`,
        subtitle: `Ca ngày ${s.fromShiftDate || "sắp tới"} → ${s.toStaffName || "người nhận"}`,
        color: "var(--ss-p3)",
        staffName: s.fromStaffName,
        raw: s,
      });
    });

    pendingAdj.forEach((a) => {
      list.push({
        id: a.id,
        type: "adjustment",
        title: `${a.staffName || "Nhân viên"} giải trình chấm công`,
        subtitle: `${a.reason || "Điều chỉnh giờ vào/ra"}`,
        color: "var(--ss-warn)",
        staffName: a.staffName,
        raw: a,
      });
    });

    pendingLeave.forEach((l) => {
      list.push({
        id: l.id,
        type: "leave",
        title: `${l.staffName || "Nhân viên"} xin nghỉ phép`,
        subtitle: `${l.reason || "Nghỉ phép"} (${l.startDate || ""} - ${l.endDate || ""})`,
        color: "var(--ss-p2)",
        staffName: l.staffName,
        raw: l,
      });
    });

    generalRequests.forEach((r) => {
      const isPending = r.status === "Đang chờ phê duyệt" || r.status === "PENDING" || r.status === "pending";
      if (!isPending) return;
      const cat = (r.typeCategory || "").toLowerCase();
      // Skip if already in specialized lists
      if (cat === "attendance" && pendingAdj.length > 0) return;
      if (cat === "leave" && pendingLeave.length > 0) return;
      if (cat === "swap" && pendingSwap.length > 0) return;

      list.push({
        id: r.id,
        type: "general",
        title: `${r.requesterName || "Nhân viên"}: ${r.requestType || "Yêu cầu"}`,
        subtitle: r.content || r.shiftInfo || "Yêu cầu vận hành",
        color: "var(--ss-amber)",
        staffName: r.requesterName,
        raw: r,
      });
    });

    return list;
  }, [pendingSwap, pendingAdj, pendingLeave, generalRequests]);

  // 9. Requests Breakdown by Category
  const requestsSummary = useMemo(() => {
    const attCount = pendingAdj.length;
    const leaveCount = pendingLeave.length;
    const swapCount = pendingSwap.length;
    let payCount = 0;

    generalRequests.forEach((r) => {
      const isPending = r.status === "Đang chờ phê duyệt" || r.status === "PENDING" || r.status === "pending";
      if (!isPending) return;
      const cat = (r.typeCategory || "").toLowerCase();
      if (cat !== "attendance" && cat !== "leave" && cat !== "swap") {
        payCount++;
      }
    });

    return [
      { key: "att", label: "Chấm công", desc: "Điều chỉnh giờ, đi trễ, về sớm", count: attCount, to: "/attendance", color: "var(--ss-warn)" },
      { key: "leave", label: "Nghỉ phép", desc: "Nghỉ phép, nghỉ bệnh, báo vắng", count: leaveCount, to: "/requests?type=leave", color: "var(--ss-p2)" },
      { key: "swap", label: "Đổi ca", desc: "Hoán đổi ca, nhận ca trống", count: swapCount, to: "/marketplace", color: "var(--ss-p3)" },
      { key: "pay", label: "Lương & NS", desc: "Bảng lương, ứng lương", count: payCount, to: "/employees?tab=payroll", color: "var(--ss-amber)" },
    ];
  }, [pendingAdj, pendingLeave, pendingSwap, generalRequests]);

  // 10. Optimistic Mutation Handler (Following frontend-optimistic-mutations 5-beat lifecycle)
  const handleOptimisticAction = useCallback(async (item, action) => {
    // Beat 1: Guard in-flight mutation
    mutatingRef.current = true;

    // Beat 2: Snapshot prior state verbatim
    const snapshot = {
      pendingSwap: [...pendingSwap],
      pendingAdj: [...pendingAdj],
      pendingLeave: [...pendingLeave],
      generalRequests: [...generalRequests],
    };

    // Beat 3: Optimistic instant patch
    if (item.type === "swap") {
      setPendingSwap((prev) => prev.filter((s) => s.id !== item.id));
    } else if (item.type === "adjustment") {
      setPendingAdj((prev) => prev.filter((a) => a.id !== item.id));
    } else if (item.type === "leave") {
      setPendingLeave((prev) => prev.filter((l) => l.id !== item.id));
    } else {
      setGeneralRequests((prev) => prev.filter((r) => r.id !== item.id));
    }

    const actionText = action === "approve" ? "phê duyệt" : "từ chối";
    toast.success(`Đã ${actionText} yêu cầu của ${item.staffName || "nhân viên"}`);

    // Beat 4: Execute API call with verbatim rollback on error
    try {
      if (item.type === "swap") {
        if (action === "approve") await approveSwapRequest(item.id);
        else await rejectSwapRequest(item.id);
      } else if (item.type === "adjustment") {
        if (action === "approve") await approveAdjustmentRequest(selectedStoreId, item.id);
        else await rejectAdjustmentRequest(selectedStoreId, item.id);
      } else if (item.type === "leave") {
        if (action === "approve") await approveLeaveRequest(selectedStoreId, item.id);
        else await rejectLeaveRequest(selectedStoreId, item.id, { rejectionReason: "Từ chối bởi quản lý" });
      } else {
        await updateRequestStatus(item.id, action === "approve" ? "Đã phê duyệt" : "Từ chối");
      }
    } catch (err) {
      // Roll back verbatim to snapshot
      setPendingSwap(snapshot.pendingSwap);
      setPendingAdj(snapshot.pendingAdj);
      setPendingLeave(snapshot.pendingLeave);
      setGeneralRequests(snapshot.generalRequests);
      toast.error(`Thao tác không thành công: ${err.response?.data?.message || err.message}`);
    } finally {
      mutatingRef.current = false;
      // Beat 5: Settle & Invalidate across app components
      window.dispatchEvent(new CustomEvent("store_requests_updated"));
      window.dispatchEvent(new CustomEvent("notification_received"));
    }
  }, [pendingSwap, pendingAdj, pendingLeave, generalRequests, selectedStoreId]);

  // 11. Week Arrays for Charts (7 days centered around selected date)
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(date);
      d.setDate(d.getDate() + i - 3);
      return d;
    });
  }, [date]);

  const assignedData = useMemo(() => {
    return week.map((day) => {
      const dISO = fmtISO(day);
      const dayShifts = shifts.filter((s) => s.shiftDate === dISO || s.date === dISO);

      const counts = {};
      positions.forEach((p) => { counts[p.id] = 0; });

      dayShifts.forEach((s) => {
        if (s.shiftAssignments && s.shiftAssignments.length > 0) {
          s.shiftAssignments.forEach((assign) => {
            const empName = assign.staffName || assign.employeeName || assign.userFullName;
            const assignEmpId = String(assign.staffId || assign.employeeId || "");
            if (selectedEmp && empName !== selectedEmp.name && assignEmpId !== selectedEmp.id) return;

            const posId = resolvePositionId(s, assign, positions);
            counts[posId] = (counts[posId] || 0) + 1;
          });
        } else {
          const empName = s.staffName;
          const shiftEmpId = String(s.staffId || "");
          if (selectedEmp && empName !== selectedEmp.name && shiftEmpId !== selectedEmp.id) return;

          const posId = resolvePositionId(s, null, positions);
          const count = s.requiredStaff || 1;
          counts[posId] = (counts[posId] || 0) + count;
        }
      });

      return { day, counts };
    });
  }, [week, shifts, positions, selectedEmp]);

  const hoursData = useMemo(() => {
    return week.map((day) => {
      const dISO = fmtISO(day);
      const dayShifts = shifts.filter((s) => s.shiftDate === dISO || s.date === dISO);

      let planned = 0;
      dayShifts.forEach((s) => {
        const start = parseHour(s.startTime, 7);
        const end = parseHour(s.endTime, 15);
        const dur = Math.max(0, end - start);

        if (s.shiftAssignments && s.shiftAssignments.length > 0) {
          s.shiftAssignments.forEach((assign) => {
            const empName = assign.staffName || assign.employeeName || assign.userFullName;
            const assignEmpId = String(assign.staffId || assign.employeeId || "");
            if (selectedEmp && empName !== selectedEmp.name && assignEmpId !== selectedEmp.id) return;
            planned += dur;
          });
        } else {
          const empName = s.staffName;
          const shiftEmpId = String(s.staffId || "");
          if (selectedEmp && empName !== selectedEmp.name && shiftEmpId !== selectedEmp.id) return;
          planned += dur * (s.requiredStaff || 1);
        }
      });

      let actual = 0;
      const dayAtt = attendanceList.filter((a) => {
        const aDate = a.shiftDate || a.date || a.attendanceDate || (a.checkInTime ? fmtISO(new Date(a.checkInTime)) : "");
        return aDate === dISO;
      });

      dayAtt.forEach((a) => {
        const empName = a.staffName || a.employeeName || "";
        const id = String(a.staffId || a.employeeId || "");
        if (selectedEmp && empName !== selectedEmp.name && id !== selectedEmp.id) return;

        if (a.checkInTime && a.checkOutTime) {
          const durMs = new Date(a.checkOutTime) - new Date(a.checkInTime);
          const h = Math.max(0, durMs / (1000 * 60 * 60));
          actual += h;
        } else if (a.status === "PRESENT") {
          actual += 8;
        }
      });

      return {
        day,
        planned: Math.round(planned * 10) / 10,
        actual: Math.round(actual * 10) / 10,
      };
    });
  }, [week, shifts, attendanceList, selectedEmp]);

  // 12. KPIs Calculation
  const kpis = useMemo(() => {
    let dayShifts = shifts.filter((s) => s.shiftDate === dateISO || s.date === dateISO);
    if (selectedEmp) {
      dayShifts = dayShifts.filter((s) => {
        if (s.staffName === selectedEmp.name || String(s.staffId) === selectedEmp.id) return true;
        return s.shiftAssignments?.some(
          (a) => (a.staffName || a.employeeName) === selectedEmp.name || String(a.staffId) === selectedEmp.id
        );
      });
    }

    let openShifts = 0;
    let totalRequired = 0;
    let totalAssigned = 0;
    let totalScheduledHours = 0;

    dayShifts.forEach((s) => {
      const required = s.requiredStaff || 1;
      const assigned = (s.shiftAssignments && s.shiftAssignments.length) || (s.staffId ? 1 : 0);
      totalRequired += required;
      totalAssigned += assigned;
      if (assigned < required) {
        openShifts += (required - assigned);
      }

      const start = parseHour(s.startTime, 7);
      const end = parseHour(s.endTime, 15);
      const dur = Math.max(0, end - start);
      totalScheduledHours += dur * Math.max(1, assigned);
    });

    const coverage = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 100;
    const laborCost = totalScheduledHours * 30000;

    let todayAtt = attendanceList.filter((a) => {
      const aDate = a.shiftDate || a.date || a.attendanceDate || (a.checkInTime ? fmtISO(new Date(a.checkInTime)) : "");
      return aDate === dateISO;
    });
    if (selectedEmp) {
      todayAtt = todayAtt.filter((a) => (a.staffName || a.employeeName) === selectedEmp.name || String(a.staffId) === selectedEmp.id);
    }

    const lateAtt = todayAtt.filter((a) => a.status === "LATE");
    const absentAtt = todayAtt.filter((a) => a.status === "ABSENT");

    const lateRate = todayAtt.length > 0 ? (lateAtt.length / todayAtt.length) * 100 : 0;
    const absentRate = totalAssigned > 0 ? (absentAtt.length / totalAssigned) * 100 : 0;

    const pendingRequests = detailedPendingItems.length;

    return {
      openShifts,
      coverage,
      laborCost,
      lateRate,
      absentRate,
      pendingRequests,
    };
  }, [shifts, dateISO, selectedEmp, attendanceList, detailedPendingItems]);

  // Current Store Name
  const currentStore = useMemo(() => {
    return stores.find((s) => String(s.id) === String(selectedStoreId)) || { id: selectedStoreId, name: "ShiftSync Store" };
  }, [stores, selectedStoreId]);

  // 13. Consolidated Dashboard Data Contract
  const dashboardData = useMemo(() => {
    return {
      date,
      positions,
      kpis,
      shifts: timelineShifts,
      requests: requestsSummary,
      pendingItems: detailedPendingItems,
      attendance: dayAttendance,
      assigned: assignedData,
      hours: hoursData,
      spatial: {
        store: currentStore,
        layout: storeLayout,
        zones: storeZones,
        activeShifts: shifts,
      },
    };
  }, [date, positions, kpis, timelineShifts, requestsSummary, detailedPendingItems, dayAttendance, assignedData, hoursData, currentStore, storeLayout, storeZones, shifts]);

  // 14. CSV Export
  const handleExport = useCallback(() => {
    try {
      const headers = ["Ngày", "Lịch xếp (giờ)", "Thực làm (giờ)"];
      const rows = hoursData.map((h) => [
        fmtISO(h.day),
        h.planned,
        h.actual,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bao_Cao_Gio_Lam_${selectedStoreId || "store"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất báo cáo giờ làm việc thành công!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Xuất báo cáo thất bại");
    }
  }, [hoursData, selectedStoreId]);

  return (
    <>
      {dataLoadErrors.length > 0 && (
        <div role="status" style={{ margin: '12px 24px 0', padding: '10px 14px', border: '1px solid #f59e0b', borderRadius: 10, background: '#fffbeb', color: '#92400e' }}>
          Một số dữ liệu chưa tải được: {dataLoadErrors.join(', ')}. Dữ liệu đang hiển thị có thể chưa đầy đủ.
        </div>
      )}
      <Dashboard
      data={dashboardData}
      employees={employeesList}
      employeeId={employeeId}
      onEmployeeChange={setEmployeeId}
      onDateChange={setDate}
      onExport={handleExport}
      onOptimisticAction={handleOptimisticAction}
      storeName={currentStore.name}
      assignTo="/schedule"
      />
    </>
  );
}
