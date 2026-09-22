/**
 * Avatar3D.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Entry point duy nhất để import Avatar3D từ bất kỳ screen nào.
 *
 * Metro Bundler tự chọn đúng implementation:
 *   - iOS / Android  → Avatar3D.native.js  (safe React Native fallback)
 *   - Web (browser)  → Avatar3D.web.js     (via @react-three/fiber web standard)
 *
 * Cách dùng:
 *   import Avatar3D from '../components/Avatar3D';
 *
 *   <Avatar3D
 *     size={80}
 *     skinColor="#F4C5A3"
 *     eyeColor="#3A86FF"
 *   />
 *
 * THAY THẾ:
 *   Tìm và thay <Image source={...avatarFile} style={...} />
 *   bằng <Avatar3D size={<chiều rộng Image cũ>} skinColor="..." eyeColor="..." />
 *
 * Props:
 *   size       {number}  Kích thước px (width = height). Default: 80
 *   skinColor  {string}  Màu da dạng hex, vd "#F4C5A3". Default: "#F4C5A3"
 *   eyeColor   {string}  Màu đồng tử dạng hex, vd "#3A86FF". Default: "#3A86FF"
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Fallback cho trường hợp Metro không resolve .native.js / .web.js
// (hiếm, nhưng an toàn khi dùng bundler khác như Vite, Jest, v.v.)
export { default } from './Avatar3D.native';
