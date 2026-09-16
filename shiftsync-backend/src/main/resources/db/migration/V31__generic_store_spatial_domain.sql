-- ============================================================
-- V31__generic_store_spatial_domain.sql
-- ShiftSync Generic Store Spatial Domain Migration
-- ============================================================

-- 1. Extend store table with category and format
ALTER TABLE store ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'FOOD_BEVERAGE';
ALTER TABLE store ADD COLUMN IF NOT EXISTS format VARCHAR(100) NOT NULL DEFAULT 'Coffee Shop';

-- 2. Extend store_layouts with versioning and timestamps
ALTER TABLE store_layouts ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE store_layouts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE store_layouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE store_layouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. Extend store_zones with spatial types, code, hierarchy, dimensions and color
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS zone_type VARCHAR(50) NOT NULL DEFAULT 'ZONE';
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS parent_zone_id UUID REFERENCES store_zones(id) ON DELETE SET NULL;
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS color VARCHAR(30);
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS description VARCHAR(255);
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS width_dim DOUBLE PRECISION DEFAULT 3.0;
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS length_dim DOUBLE PRECISION DEFAULT 4.0;
ALTER TABLE store_zones ADD COLUMN IF NOT EXISTS height_dim DOUBLE PRECISION DEFAULT 2.8;

-- 4. Create workstations table for granular station level tracking
CREATE TABLE IF NOT EXISTS workstations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES store_zones(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    workstation_type VARCHAR(50) NOT NULL DEFAULT 'GENERIC_COUNTER',
    x_coord DOUBLE PRECISION NOT NULL DEFAULT 0,
    y_coord DOUBLE PRECISION NOT NULL DEFAULT 0,
    z_coord DOUBLE PRECISION NOT NULL DEFAULT 0,
    capacity INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workstations_store ON workstations(store_id);
CREATE INDEX IF NOT EXISTS idx_workstations_zone ON workstations(zone_id);

-- 5. Extend shift_skill_requirement with explicit spatial targets (Zone & Workstation)
ALTER TABLE shift_skill_requirement ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES store_zones(id) ON DELETE SET NULL;
ALTER TABLE shift_skill_requirement ADD COLUMN IF NOT EXISTS workstation_id UUID REFERENCES workstations(id) ON DELETE SET NULL;

-- 6. Extend shift_assignment with workstation_id
ALTER TABLE shift_assignment ADD COLUMN IF NOT EXISTS workstation_id UUID REFERENCES workstations(id) ON DELETE SET NULL;

-- 7. Create store_templates table for fast, extensible store onboarding
CREATE TABLE IF NOT EXISTS store_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    format VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    template_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Seed default Store Templates for common enterprise formats
INSERT INTO store_templates (id, name, category, format, description, template_data)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Cửa hàng Cà phê (Coffee Shop)',
        'FOOD_BEVERAGE',
        'Coffee Shop',
        'Mẫu bố trí chuẩn cho quán cà phê với quầy pha chế, thu ngân, sảnh tiếp khách và kho',
        '{
            "layout": {"length": 24.0, "width": 16.0, "height": 5.0},
            "zones": [
                {"name": "Quầy Pha chế (Barista)", "code": "Z-BARISTA", "zoneType": "COUNTER", "x": 4.0, "y": 3.0, "z": 0.0, "capacity": 4, "color": "#0D9488"},
                {"name": "Quầy Thu ngân (POS)", "code": "Z-POS", "zoneType": "COUNTER", "x": 8.0, "y": 3.0, "z": 0.0, "capacity": 2, "color": "#0284C7"},
                {"name": "Sảnh Khách (Dining Area)", "code": "Z-DINING", "zoneType": "SEATING", "x": 14.0, "y": 8.0, "z": 0.0, "capacity": 8, "color": "#EAB308"},
                {"name": "Bếp Nướng & Bánh (Bakery)", "code": "Z-BAKERY", "zoneType": "WORKSTATION", "x": 4.0, "y": 12.0, "z": 0.0, "capacity": 3, "color": "#F97316"},
                {"name": "Kho Nguyên liệu (Storage)", "code": "Z-STORAGE", "zoneType": "STORAGE", "x": 20.0, "y": 3.0, "z": 0.0, "capacity": 2, "color": "#64748B"}
            ],
            "workstations": [
                {"name": "Máy Espresso #1", "code": "WS-ESP-1", "workstationType": "EQUIPMENT", "zoneName": "Quầy Pha chế (Barista)", "x": 3.5, "y": 3.0, "z": 0.0, "capacity": 1},
                {"name": "Máy Espresso #2", "code": "WS-ESP-2", "workstationType": "EQUIPMENT", "zoneName": "Quầy Pha chế (Barista)", "x": 4.8, "y": 3.0, "z": 0.0, "capacity": 1},
                {"name": "Máy POS #1", "code": "WS-POS-1", "workstationType": "COUNTER", "zoneName": "Quầy Thu ngân (POS)", "x": 8.0, "y": 3.0, "z": 0.0, "capacity": 1}
            ]
        }'::jsonb
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'Cửa hàng Giày & Thời trang (Shoe & Retail Store)',
        'RETAIL',
        'Footwear Retail',
        'Mẫu bố trí chuẩn cho cửa hàng bán lẻ giày dép với khu trưng bày, thử giày, thu ngân và kho hàng',
        '{
            "layout": {"length": 22.0, "width": 14.0, "height": 4.5},
            "zones": [
                {"name": "Khu Trưng bày Nam (Men Display)", "code": "Z-MEN", "zoneType": "DISPLAY", "x": 5.0, "y": 3.5, "z": 0.0, "capacity": 3, "color": "#2563EB"},
                {"name": "Khu Trưng bày Nữ (Women Display)", "code": "Z-WOMEN", "zoneType": "DISPLAY", "x": 5.0, "y": 10.0, "z": 0.0, "capacity": 3, "color": "#EC4899"},
                {"name": "Khu Thử Giày (Try-on Area)", "code": "Z-TRYON", "zoneType": "SEATING", "x": 12.0, "y": 7.0, "z": 0.0, "capacity": 4, "color": "#8B5CF6"},
                {"name": "Quầy Thanh toán (Checkout)", "code": "Z-CHECKOUT", "zoneType": "COUNTER", "x": 18.0, "y": 3.5, "z": 0.0, "capacity": 2, "color": "#10B981"},
                {"name": "Kho Giày Hậu cần (Stockroom)", "code": "Z-STOCK", "zoneType": "STORAGE", "x": 18.0, "y": 11.0, "z": 0.0, "capacity": 3, "color": "#475569"}
            ],
            "workstations": [
                {"name": "Bàn Thu ngân 1", "code": "WS-CASH-1", "workstationType": "COUNTER", "zoneName": "Quầy Thanh toán (Checkout)", "x": 18.0, "y": 3.5, "z": 0.0, "capacity": 1},
                {"name": "Kệ Soạn Hàng Kho", "code": "WS-RACK-1", "workstationType": "STORAGE", "zoneName": "Kho Giày Hậu cần (Stockroom)", "x": 18.0, "y": 11.0, "z": 0.0, "capacity": 2}
            ]
        }'::jsonb
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'Salon Tóc & Thẩm mỹ (Salon & Beauty)',
        'SERVICE',
        'Salon',
        'Mẫu bố trí chuẩn cho salon làm đẹp với lễ tân tiếp đón, khu cắt uốn, gội xả và chăm sóc chuyên sâu',
        '{
            "layout": {"length": 18.0, "width": 12.0, "height": 4.0},
            "zones": [
                {"name": "Lễ tân & Tiếp đón (Reception)", "code": "Z-RECEPT", "zoneType": "SERVICE_POINT", "x": 3.5, "y": 3.0, "z": 0.0, "capacity": 2, "color": "#06B6D4"},
                {"name": "Khu Tạo mẫu Tóc (Hair Styling)", "code": "Z-STYLING", "zoneType": "WORKSTATION", "x": 9.0, "y": 3.0, "z": 0.0, "capacity": 4, "color": "#A855F7"},
                {"name": "Khu Gội đầu & Xả (Shampoo Area)", "code": "Z-SHAMPOO", "zoneType": "WORKSTATION", "x": 9.0, "y": 9.0, "z": 0.0, "capacity": 3, "color": "#3B82F6"},
                {"name": "Phòng Chăm sóc Da (Treatment)", "code": "Z-TREATMENT", "zoneType": "AREA", "x": 15.0, "y": 6.0, "z": 0.0, "capacity": 2, "color": "#F43F5E"}
            ],
            "workstations": [
                {"name": "Ghế Stylist #1", "code": "WS-CHAIR-1", "workstationType": "WORKSTATION", "zoneName": "Khu Tạo mẫu Tóc (Hair Styling)", "x": 7.5, "y": 3.0, "z": 0.0, "capacity": 1},
                {"name": "Ghế Stylist #2", "code": "WS-CHAIR-2", "workstationType": "WORKSTATION", "zoneName": "Khu Tạo mẫu Tóc (Hair Styling)", "x": 10.5, "y": 3.0, "z": 0.0, "capacity": 1},
                {"name": "Bồn Gội #1", "code": "WS-WASH-1", "workstationType": "WORKSTATION", "zoneName": "Khu Gội đầu & Xả (Shampoo Area)", "x": 9.0, "y": 9.0, "z": 0.0, "capacity": 1}
            ]
        }'::jsonb
    )
ON CONFLICT (id) DO NOTHING;
