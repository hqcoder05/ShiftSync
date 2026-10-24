# ShiftSync Digital Twin — 3D Visual Style Specification & Asset Unification Standard

> **Document Code:** `docs/architecture/DIGITAL_TWIN_VISUAL_STYLE_SPEC.md`  
> **Author:** Senior 3D Environment Artist & Digital Twin Architect  
> **Reference Benchmark:** `ShiftSync-Web/public/models/ShiftSync_Workstation.glb` (Standalone Premium Employee Workstation)  
> **Status:** APPROVED & BINDING  

---

## 1. Executive Summary & Quality Benchmark

The ShiftSync Store Digital Twin environment requires all visible 3D furniture, operational workstations, commercial food & beverage equipment, customer seating, architectural elements, and props to adhere strictly to the visual style, material sophistication, geometric fidelity, and professional finish established by the reference **ShiftSync Workstation Desk** (`ShiftSync_Workstation.glb`).

---

## 2. Phase 0 — Comprehensive Reference Desk Inspection

| Characteristic | Inspected Specification of Reference Desk (`ShiftSync_Workstation.glb`) |
| :--- | :--- |
| **Asset Container** | glTF 2.0 Binary (`.glb`), File Size: 2.73 MB, Generator: Three.js GLTFExporter |
| **Object Hierarchy** | 71 meshes, 102 nodes structured into distinct functional groups: `Desk_Group`, `Ergonomic_Chair`, `Monitor_Assembly`, `Desk_Accessories`, `Desk_Lamp`, `Cable_Management`, `Status_Indicator_Puck`. |
| **Physical Dimensions** | Width: 1.47m, Depth: 1.32m, Height: 1.32m. Top surface at $Y = 0.75\text{m}$. |
| **Geometric Language** | **Precision Hard-Surface with Softened Chamfers & Bevels ($r = 0.01\text{m} - 0.03\text{m}$)**. No sharp primitive edges. Clearly distinguished assemblies (separate table legs, structural crossbars, leveling feet, multi-stage monitor arm, curved lumbar spine, ventilated backrest, cushion contours, cable drops, and mechanical keycaps). |
| **Material Workflow** | Standard PBR Metallic-Roughness with 16 specialized materials, embedded micro-textures, transmission glass, and emissive strengths up to 2.8. |
| **Color Palette** | **Warm Natural Scandinavian Oak** (`#ba7a3e`), **Matte Powder-Coated Dark Steel** (`#030405`), **Polished Chrome** (`#afb8c6`), **Brushed Brass** (`#935315`), **Dark Graphite Polymer** (`#040507`), **Anti-Reflective Display Glass**, **Emerald Active Status Beacon** (`#00e98c`). |
| **Lighting Response** | Reacts accurately to directional key lights with soft PCF shadow falloff, subtle ambient occlusion in crevices, specular reflections on metals, diffuse bounce on wood/fabrics, and active self-illumination on screens and LEDs. |
| **Visual Style Definition** | **Nordic High-End Stylized Realism with Functional SaaS Fidelity.** |

---

## 3. Phase 1 — Digital Twin Global Visual Style Specification

Every visible 3D object inside the coffee shop Digital Twin must conform to the following universal rules:

### 3.1 Geometric Rules
1. **Beveled & Chamfered Profiles:**
   - Countertops, tables, desks, monitors, and equipment bodies must have beveled or filleted edges ($r \ge 0.015\text{m}$). Sharp, raw box edges are strictly prohibited.
2. **Modular Structural Assemblies:**
   - Objects must be constructed of realistic sub-components (bases, kickplates, frames, hardware handles, brackets, hinges, glides).
   - Furniture bases must feature recessed dark toe-kicks ($0.08\text{m} - 0.10\text{m}$ high) to create natural shadow grounding.
3. **Ergonomic & Architectural Proportions:**
   - Prep counters: $0.90\text{m} - 0.95\text{m}$ height, $0.85\text{m} - 1.05\text{m}$ depth.
   - Dining tables: $0.74\text{m} - 0.76\text{m}$ height.
   - Bar / communal counters: $1.05\text{m}$ height.
   - Chair seat height: $0.45\text{m}$; Bar stool seat height: $0.75\text{m}$.
4. **Normals & Silhouette Cleanliness:**
   - Cylinders and curved elements must use adequate radial segments (16 to 32) for smooth silhouettes while respecting WebGL polygon budgets ($< 90\text{k}$ total scene triangles).

### 3.2 Material & Texture Standards (PBR Metallic-Roughness)
| Material Key | Base Color | Roughness | Metalness | Texture / Detail Treatment |
| :--- | :--- | :---: | :---: | :--- |
| **Natural Oak Wood** | `#D4A373` (`#ba7a3e`) | 0.45 | 0.02 | Subtle linear wood grain, soft satin sheen |
| **Dark Walnut Wood** | `#5A3825` (`#633818`) | 0.50 | 0.02 | Deep rich grain, matte oiled finish |
| **White Calacatta Quartz** | `#FAF7F2` | 0.25 | 0.05 | Fine light grey veining, smooth polished reflection |
| **Heavy Stainless Steel (Inox 304)** | `#E2E8F0` | 0.18 | 0.92 | Brushed directional anisotropic highlight, hygienic prep finish |
| **Commercial Polished Chrome** | `#F1F5F9` | 0.12 | 0.96 | Specular mirror-like reflections on machine group heads & levers |
| **Powder-Coated Dark Metal** | `#1E293B` | 0.35 | 0.80 | Fine matte tactile grain on frames, legs, and track rails |
| **Brushed Warm Brass / Bronze** | `#D97706` | 0.24 | 0.90 | Warm golden reflections on accents, lamps, and trim |
| **Commercial Transmission Glass** | `#BAE6FD` | 0.08 | 0.08 | Transmission $0.85$, subtle cyan tint, transparent refraction |
| **Channel-Tufted Upholstery (Emerald)** | `#1E4D3A` | 0.80 | 0.02 | Woven fabric micro-texture, velvety light scattering |
| **Channel-Tufted Upholstery (Terracotta)**| `#B45309` | 0.82 | 0.02 | Warm leatherette / wool blend tactile feel |
| **Terrazzo Modular Tile Floor** | `#F5EBE0` | 0.65 | 0.04 | Discrete mineral flecks (amber, charcoal, quartz), clean recessed grout |
| **Herringbone Oak Parquet Floor** | `#C89D6C` | 0.58 | 0.02 | Individual interlocking wood planks with tonal variations |
| **Dark Charcoal Barista Slate** | `#334155` | 0.68 | 0.06 | Non-slip commercial tile texture with dark grout |
| **Active Screen UI & LED Emissive** | Custom UI / `#00E98C` | 0.12 | 0.10 | Self-illuminating display panels with crisp vector graphics |

---

## 4. Object Category Upgrade Directives

### 4.1 Workstations & Operational Counters
- **POS / Cashier Station (`Workstation_POS_01`):** Vertical fluted oak front slats, 60mm beveled white quartz countertop, recessed dark metal kickplate, dual touchscreens (cashier angled + customer display), thermal receipt printer with paper slip, card reader with keypad/NFC chip, barcode scanner, cable drop grommet.
- **Barista Espresso Bar (`Workstation_Barista_01`):** Heavy-gauge stainless steel prep top with recessed drip troughs and glass rinser sink, commercial 2-group espresso machine with dual chrome group heads, dual portafilters, pressure dials, steam wands with heat sleeves, cup warming top rack with stacked ceramic cups, dual on-demand coffee grinders with visible roasted beans in transparent hoppers, tamping station with tamper and mat, knock box with spent coffee cake, stainless steel milk frothing pitchers, syrup bottles with pump heads.
- **Hand-Brew & Customer Service (`Workstation_Service_01`):** Beveled quartz pickup counter, brushed brass 3-position pour-over dripper stand with glass Hario server carafes, gooseneck electric kettle on digital base, precision timer scale, wooden condiment organizer with napkins, stirrers, and cup lids.
- **Pastry & Bakery Showcase (`Workstation_Kitchen_01`):** Curved front glass showcase cabinet, warm LED under-shelf illumination, tiered glass display shelves with polished chrome brackets, realistic golden flaky croissants, chocolate chip muffins, pastel macarons, stainless steel serving tongs, under-counter refrigeration drawers with brushed inox pull handles.

### 4.2 Customer Dining Furniture
- **Bistro Tables:** Solid 75cm circular beveled oak and marble tops, fluted heavy cast-iron pedestal column, brass collar ring, cruciform ground base.
- **Bistro Chairs:** Ergonomically curved bentwood backrest, contoured saddle seat with soft upholstered cushion, splayed tapered legs with brass leveling glides.
- **Communal High Table:** Thick 60mm solid oak beveled slab top, heavy dark steel trestle legs with footrest stretcher bar, flush cable management flip covers.
- **Bar Stools:** Swivel round seats with channel-tufted leatherette cushions, matte black steel column, circular footrest ring.
- **Booth Seating Clusters:** Vertical channel-tufted plush upholstery in emerald green fabric, oak plinth base, dividing acoustic privacy panels.
- **Lounge Nook:** Molded shell lounge armchairs in cognac leather, circular Carrara marble coffee table on brass tripod legs.

### 4.3 Storage & Logistics
- **Industrial Storage Racks:** Matte dark powder-coated steel slotted uprights, wire mesh decking, burlap sacks with stencil coffee origin stamps, inventory storage totes with barcode labels.

### 4.4 Architectural Environment
- **Multi-Zone Floors:** Seamless modular terrazzo tiles with clean grout lines, warm herringbone parquet in dining zone, dark non-slip slate in barista zone, brushed brass transition dividers, recessed coir entrance walk-off mat.
- **Walls & Openings:** Smooth warm off-white plaster, vertical wood slat acoustic feature wall behind the counter, dark architectural baseboards, storefront double glass doors with tubular stainless steel pull handles and glass transom, perimeter windows with black mullions.
- **Ceiling & Lighting:** Industrial black ceiling tracks with adjustable spotlights, suspended brass dome/cone pendant lights with warm filament glow.

### 4.5 Props & Greenery
- Ceramic architectural floor planters with monstera and fiddle-leaf fig foliage, hanging planter boxes with trailing pothos vines, framed cafe chalkboard menu with clean typography.
