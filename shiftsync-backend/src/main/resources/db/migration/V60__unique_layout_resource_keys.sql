-- Duplicates may already be referenced by assignments. Do not merge or delete
-- them automatically: an administrator must reconcile references first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM store_zones GROUP BY store_id,
      CASE WHEN code IS NOT NULL AND btrim(code) <> '' THEN 'code:' || lower(btrim(code)) ELSE 'name:' || lower(btrim(name)) END
      HAVING count(*) > 1)
     OR EXISTS (SELECT 1 FROM workstations GROUP BY store_id,
      CASE WHEN code IS NOT NULL AND btrim(code) <> '' THEN 'code:' || lower(btrim(code)) ELSE 'name:' || lower(btrim(name)) END
      HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Không thể nâng cấp: khu vực hoặc vị trí trùng mã/tên trong cửa hàng. Hãy đối soát các tham chiếu trước khi chạy lại V60.';
  END IF;
END $$;

CREATE UNIQUE INDEX uq_store_zone_resource_key ON store_zones (store_id,
  (CASE WHEN code IS NOT NULL AND btrim(code) <> '' THEN 'code:' || lower(btrim(code)) ELSE 'name:' || lower(btrim(name)) END));
CREATE UNIQUE INDEX uq_workstation_resource_key ON workstations (store_id,
  (CASE WHEN code IS NOT NULL AND btrim(code) <> '' THEN 'code:' || lower(btrim(code)) ELSE 'name:' || lower(btrim(name)) END));
