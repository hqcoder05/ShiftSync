-- Additive inventory; store ownership is inherited through the workstation.
CREATE TABLE workstation_equipment (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 workstation_id UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
 name VARCHAR(150) NOT NULL,
 code VARCHAR(50) NOT NULL,
 type VARCHAR(80) NOT NULL,
 status VARCHAR(30) NOT NULL CHECK (status IN ('OPERATIONAL','MAINTENANCE','OUT_OF_SERVICE','RETIRED')),
 notes VARCHAR(1000),
 CONSTRAINT uq_equipment_workstation_code UNIQUE(workstation_id, code)
);
