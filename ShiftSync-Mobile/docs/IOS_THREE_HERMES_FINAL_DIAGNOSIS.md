# ShiftSync Mobile — Final Three.js / Hermes Isolation Diagnosis

Ngày: 21/09/2026

## 1. Exact failing expression

`node_modules/three/build/three.cjs:12`:

```js
process.emitWarning(
```

The wrapper continues with the deprecation message at lines 13–15 and then exports `require('./three.module.js')` at line 17.

## 2. Runtime values

### iPhone + Expo Go + Hermes

**NOT VERIFIED** — không có iPhone thật trong môi trường này. Vì vậy chưa thể ghi nhận giá trị thực tế của `typeof process`, `typeof process.emitWarning`, hoặc crash khi import Three trên Hermes.

### Node control run (không phải Hermes)

```text
typeof process = object
typeof process.emitWarning = function
THREE loaded = true
THREE revision = 186
```

Kết quả Node chỉ là control run; không được dùng thay cho iPhone runtime.

## 3. Standalone Three import

Đường kiểm tra độc lập chỉ import `three` và kiểm tra `Scene`/`REVISION`; không import `@react-three/fiber`, `@react-three/fiber/native`, Expo GL, Avatar3D hoặc FlowerMascot3D. Gate tương ứng hiện có trong `services/diagnosticRegistry.js` (`THREE_IMPORT`).

Trên iPhone: **NOT VERIFIED**.

## 4. R3F native import

Gate riêng cho `import('@react-three/fiber/native')` tồn tại (`R3F_IMPORT`), nhưng chưa chạy được trên iPhone thật.

Kết quả iPhone: **NOT VERIFIED**.

## 5. Metro resolution

`node_modules/three/package.json` khai báo:

```json
"main": "./build/three.cjs",
"module": "./build/three.module.js",
"exports": {
  ".": {
    "import": "./build/three.module.js",
    "require": "./build/three.cjs"
  }
}
```

`@react-three/fiber@9.7.0` native bundle chứa `var THREE = require('three')`. Vì vậy nhánh CommonJS của package `three` được chọn và Metro có thể đi tới `three/build/three.cjs`. Package không có `browser`, `react-native` hoặc `engines` field.

## 6. Package metadata

| Field | Value |
|---|---|
| version | `0.186.0` |
| main | `./build/three.cjs` |
| module | `./build/three.module.js` |
| import export | `./build/three.module.js` |
| require export | `./build/three.cjs` |
| browser | none |
| react-native | none |
| engines | none |

## 7. Root cause assessment

Source-level evidence isolates the failure candidate to the Three.js CommonJS wrapper invoking `process.emitWarning` during module initialization, reached through R3F's `require('three')` path. However, the required iPhone experiment has not been executed.

## 8. Fix implemented

`components/Avatar3D.native.js` no longer imports `@react-three/fiber/native` or `Avatar3DScene` at module scope. The native implementation now uses lightweight React Native `View` primitives to preserve the avatar footprint without Three, R3F, Expo GL, or WebGL.

`components/Avatar3D.web.js` is unchanged; Web continues to use Three/R3F. Dashboard data loading, navigation, and business logic are unchanged.

This native fallback is intentional: the avatar is optional visual content and the Three/R3F path can fail during Expo Go/Hermes module initialization.

### Final verdict

**FIXED — NATIVE FALLBACK**

The source-level crash path has been removed from Dashboard startup. Physical iPhone runtime verification is still required.

## 9. Evidence

1. Line 12 is an immediate function call, not a comment or deferred code.
2. `three@0.186.0` deliberately routes `require` to `three.cjs`.
3. R3F native uses CommonJS `require('three')`.
4. Node has `process.emitWarning` and loads Three successfully.
5. Hermes values and import behavior remain unobserved.

## 10. Recommended fix

No dependency change was made. The native fallback removes the incompatible import path from Dashboard startup. Restoring native 3D requires a separate task with iPhone runtime evidence and a proven-compatible Three/R3F entry point.

## 11. Risk of possible fixes

| Possible action | Risk |
|---|---|
| Patch `three.cjs` in `node_modules` | Non-reproducible, lost on reinstall, masks package contract |
| Force Metro to a different Three entry | May break R3F's CommonJS/native bundle or produce duplicate Three instances |
| Downgrade/upgrade Three or R3F | Compatibility and regression risk; not authorized here |
| Disable Hermes | Changes the runtime rather than fixing module compatibility |
| Replace native 3D path with fallback | Avoids the path but changes product behavior |

## 12. Verification

| Check | Result |
|---|---|
| iOS Expo static export after fix | PASS |
| Web export after fix | PASS |
| Dashboard no longer imports native R3F at top level | PASS |
| iPhone Expo Go/Hermes | NOT VERIFIED — no device available |
| Android runtime | NOT VERIFIED |
| Dashboard API/data flow | Unchanged; runtime confirmation required |
| Lint | NOT VERIFIED — project has no ESLint config and default command cannot run |

## 13. Scope confirmation

- `package.json`: unchanged by this task.
- `package-lock.json`: unchanged by this task.
- `node_modules`: not patched.
- Hermes/Expo configuration: unchanged.
- Backend/business logic: unchanged.
- Git push: not run.
