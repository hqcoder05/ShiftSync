# ShiftSync Mobile — Three.js / Hermes Root-Cause Isolation

Ngày điều tra: 21/09/2026

## Phạm vi và giới hạn

Đây là điều tra nguyên nhân crash iOS/Hermes. Trong lượt này không thay đổi source ứng dụng, dependency, lockfile, Hermes, Expo config hoặc backend; không thực hiện git push.

Thiết bị iPhone thật không khả dụng trong môi trường điều tra này, vì vậy các mục runtime trên thiết bị được ghi là **NOT VERIFIED**.

## 1. Điểm crash được kiểm tra

File được nêu trong stack:

`node_modules/three/build/three.cjs:12`

Nội dung thực tế tại dòng 12:

```js
process.emitWarning(
```

Các dòng tiếp theo truyền message và options vào hàm này, sau đó dòng 17 thực hiện:

```js
module.exports = require('./three.module.js');
```

Đây là wrapper CommonJS của `three@0.186.0`. Package này tự ghi rõ wrapper CommonJS đã deprecated và hướng dẫn dùng ESM import.

## 2. Giá trị có thể là `undefined`

Nếu Hermes/React Native cung cấp một `process` polyfill không có method Node.js `emitWarning`, biểu thức thực thi tại dòng 12 tương đương:

```js
undefined(/* warning arguments */)
```

Khi đó Hermes báo `TypeError: undefined is not a function` trong lúc module được khởi tạo. Đây là nguyên nhân source-level phù hợp trực tiếp với frame `three.cjs:12`; không phải lỗi API đăng nhập hoặc backend.

Node.js đã được kiểm tra riêng: `require('three')` chạy thành công và chỉ phát cảnh báo deprecation, vì Node có `process.emitWarning`. Điều này phân biệt hành vi Node với môi trường Hermes.

## 3. Vì sao Metro chọn `three.cjs`

`node_modules/three/package.json` hiện có:

```json
"main": "./build/three.cjs",
"exports": {
  ".": {
    "import": "./build/three.module.js",
    "require": "./build/three.cjs"
  }
}
```

`@react-three/fiber@9.7.0` native bundle hiện dùng CommonJS:

```js
var THREE = require('three');
```

Vì vậy khi Metro resolve nhánh `react-native` của `@react-three/fiber`, lời gọi `require('three')` đi vào điều kiện `require` của package `three` và chọn `build/three.cjs`. Đây là đường import R3F → Three có thể dẫn thẳng tới dòng 12.

Ứng dụng cũng có `Avatar3D.native.js` import:

```js
import { Canvas } from '@react-three/fiber/native';
```

Do đó R3F native là đường kích hoạt liên quan; không có bằng chứng trong đường này cho thấy `FlowerMascot3D.web.js` được resolve trên iOS.

## 4. Phân loại nguyên nhân

**CONFIRMED — THREE.JS**

Bằng chứng tĩnh đã xác nhận wrapper `three.cjs` gọi API Node `process.emitWarning` trong lúc khởi tạo. API này không được chứng minh là tồn tại trong Hermes. Stack frame chỉ ra đúng dòng gọi đó.

**CONFIRMED — R3F / THREE INTEGRATION**

R3F native bundle dùng `require('three')`, và package contract của Three chọn CommonJS wrapper cho điều kiện `require`.

**NOT VERIFIED — runtime iPhone**

Không thể xác nhận trực tiếp giá trị `typeof process.emitWarning` trên thiết bị thật trong lượt này. Vì vậy kết luận cuối cùng về runtime được giữ ở mức `UNRESOLVED` cho đến khi chạy diagnostic import trên iPhone.

## 5. Diagnostic gates hiện có

`services/diagnosticRegistry.js` đã có các gate độc lập, không dùng Canvas/GL trong gate Three import:

1. `THREE_IMPORT`: dynamic `import('three')`, kiểm tra `Scene`.
2. `R3F_IMPORT`: dynamic `import('@react-three/fiber/native')`, kiểm tra `Canvas`.
3. `CANVAS_MOUNT` và `MINIMAL_SCENE`: hiện để `SKIPPED`, chỉ chạy sau khi hai gate import pass.

Các gate Avatar/Flower được chạy riêng sau đó. Chúng không thay đổi logic nghiệp vụ.

## 6. Kết quả kiểm tra hiện tại

| Kiểm tra | Kết quả |
|---|---|
| Đọc chính xác `three.cjs:12` | PASS |
| Xác định expression gây lỗi tiềm năng | PASS: `process.emitWarning(...)` |
| Xác định package resolution | PASS: `require('three')` → `three.cjs` |
| Node `require('three')` | PASS, chỉ warning |
| iOS Hermes Three import | NOT VERIFIED — không có iPhone |
| iOS Hermes R3F import | NOT VERIFIED — không có iPhone |
| Canvas mount / minimal scene | NOT VERIFIED |
| Expo iOS static export | PASS (bundle tạo được; không thay thế runtime test) |

## 7. Kết luận không sửa mã

Không thực hiện workaround bằng cách sửa `node_modules`, đổi dependency, đổi resolver hoặc thay Three/R3F trong task này. Cần chạy iPhone diagnostic để xác nhận trực tiếp `process.emitWarning` và hoàn tất phân loại runtime.

### Final verdict

**UNRESOLVED — source-level cause strongly isolated to `three.cjs:12` via R3F CommonJS resolution, but physical iOS/Hermes runtime confirmation is still required.**

