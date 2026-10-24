import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Store, Users, MapPin } from "lucide-react";
import TwoDSpatialSchematic from "./TwoDSpatialSchematic";
import { getZoneThemeColor } from "./spatial.constants";

export default function DashboardSpatialSummary({
  store,
  layout = { length: 24, width: 16, height: 5 },
  zones = [],
  activeShifts = [],
}) {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(null);

  // Map active staff to zones
  const activeStaff = useMemo(() => {
    if (!zones || zones.length === 0) return [];
    const list = [];
    const zoneOccupancy = {};
    zones.forEach((z) => {
      zoneOccupancy[z.id] = 0;
    });

    const findBestZoneForRole = (roleOrSkill = "") => {
      const lower = (roleOrSkill || "").toLowerCase();
      let targetZone = zones.find((z) => {
        const zn = (z.name || "").toLowerCase();
        const zt = (z.zoneType || "").toLowerCase();
        return (zn && lower.includes(zn)) || (zt && lower.includes(zt));
      });

      if (targetZone && (zoneOccupancy[targetZone.id] || 0) < (targetZone.capacity || 4)) {
        return targetZone.id;
      }
      const availableZone = zones.find((z) => (zoneOccupancy[z.id] || 0) < (z.capacity || 4));
      if (availableZone) return availableZone.id;
      return zones[0]?.id;
    };

    activeShifts.forEach((shift) => {
      if (shift.shiftAssignments && Array.isArray(shift.shiftAssignments)) {
        shift.shiftAssignments.forEach((assign, aIdx) => {
          let role = assign.skillName || assign.requiredSkillName || assign.role || "";
          if (!role && shift.skillRequirements && shift.skillRequirements.length > 0) {
            const req = shift.skillRequirements[aIdx % shift.skillRequirements.length];
            role = req?.skillName || "";
          }
          if (!role) role = shift.skillName || "";

          const assignedZoneId = assign.zoneId && zones.some((z) => z.id === assign.zoneId)
            ? assign.zoneId
            : findBestZoneForRole(role);

          if (assignedZoneId) {
            zoneOccupancy[assignedZoneId] = (zoneOccupancy[assignedZoneId] || 0) + 1;
          }

          list.push({
            id: assign.id || assign.staffId,
            staffName: assign.staffName || "Nhân sự",
            skillName: role || "Nhân sự",
            zoneId: assignedZoneId,
          });
        });
      } else if (shift.staffName) {
        const role = shift.skillName || "";
        const assignedZoneId = shift.zoneId && zones.some((z) => z.id === shift.zoneId)
          ? shift.zoneId
          : findBestZoneForRole(role);

        if (assignedZoneId) {
          zoneOccupancy[assignedZoneId] = (zoneOccupancy[assignedZoneId] || 0) + 1;
        }

        list.push({
          id: shift.staffId || shift.id,
          staffName: shift.staffName,
          skillName: role || "Nhân sự",
          zoneId: assignedZoneId,
        });
      }
    });
    return list;
  }, [activeShifts, zones]);

  const totalCapacity = useMemo(() => {
    return zones.reduce((sum, z) => sum + (z.capacity || 4), 0);
  }, [zones]);

  const floorArea = Math.round((layout.length || 24) * (layout.width || 16));

  return (
    <div className="db-spatial-card">
      <div className="db-spatial-head">
        <div className="db-spatial-meta">
          <Store size={16} className="db-spatial-icon" />
          <div>
            <h4>
              Sơ đồ bố trí mặt bằng
              <span className="db-spatial-tag">{floorArea} m²</span>
            </h4>
            <small>
              {layout.length || 24}m × {layout.width || 16}m • {activeStaff.length}/{totalCapacity} nhân sự trực ca
            </small>
          </div>
        </div>

        <button
          type="button"
          className="db-spatial-btn"
          onClick={() => navigate("/schedule?view=3d")}
          title="Mở không gian 3D tương tác toàn màn hình"
        >
          <span>Xem 3D</span>
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="db-spatial-canvas-wrap">
        <TwoDSpatialSchematic
          layout={layout}
          zones={zones}
          staff={activeStaff}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          showWorkstations={true}
        />
      </div>

      {zones.length > 0 && (
        <div className="db-spatial-zones">
          {zones.map((zone) => {
            const zStaffCount = activeStaff.filter((s) => s.zoneId === zone.id).length;
            const cap = zone.capacity || 4;
            const color = getZoneThemeColor(zone.name);
            const isSelected = selectedZone?.id === zone.id;

            return (
              <button
                type="button"
                key={zone.id || zone.name}
                className={`db-zone-chip ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedZone(isSelected ? null : zone)}
              >
                <span className="db-zone-dot" style={{ backgroundColor: color }} />
                <span className="db-zone-name">{zone.name}</span>
                <span className="db-zone-count">
                  {zStaffCount}/{cap}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
