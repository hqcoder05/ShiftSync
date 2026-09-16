-- V32: Link shift_skill_requirement and shift_assignment to corresponding store_zones
-- Automatically maps Barista to Barista Counter, Cashier to POS & Cashier, etc.

UPDATE shift_skill_requirement ssr
SET zone_id = sz.id
FROM skill sk, store_zones sz
WHERE ssr.skill_id = sk.id
  AND sk.store_id = sz.store_id
  AND ssr.zone_id IS NULL
  AND (
    (LOWER(sk.name) LIKE '%barista%' AND (LOWER(sz.name) LIKE '%barista%' OR LOWER(sz.name) LIKE '%pha chế%'))
    OR
    (LOWER(sk.name) LIKE '%cashier%' AND (LOWER(sz.name) LIKE '%cashier%' OR LOWER(sz.name) LIKE '%pos%' OR LOWER(sz.name) LIKE '%thu ngân%'))
    OR
    (LOWER(sk.name) LIKE '%waiter%' AND (LOWER(sz.name) LIKE '%dining%' OR LOWER(sz.name) LIKE '%sảnh%'))
    OR
    (LOWER(sk.name) LIKE '%kitchen%' AND (LOWER(sz.name) LIKE '%kitchen%' OR LOWER(sz.name) LIKE '%bếp%'))
    OR
    (LOWER(sk.name) LIKE '%leader%' AND (LOWER(sz.name) LIKE '%pos%' OR LOWER(sz.name) LIKE '%cashier%' OR LOWER(sz.name) LIKE '%barista%'))
  );

-- Update existing shift_assignment rows that have null zone_id using staff_skill matches
UPDATE shift_assignment sa
SET zone_id = ssr.zone_id,
    required_skill_id = COALESCE(sa.required_skill_id, ssr.skill_id)
FROM shift s, shift_skill_requirement ssr, staff_skill stsk
WHERE sa.shift_id = s.id
  AND ssr.shift_id = s.id
  AND sa.zone_id IS NULL
  AND ssr.zone_id IS NOT NULL
  AND stsk.staff_id = sa.staff_id
  AND stsk.skill_id = ssr.skill_id;
