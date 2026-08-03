# ShiftSync - Tech Stack & Architecture Decisions

Tài liệu này chốt danh sách công nghệ, phiên bản cụ thể và lý do lựa chọn cho dự án ShiftSync. Mọi thành viên trong nhóm cần tuân thủ đúng phiên bản này để tránh xung đột dependency (dependency hell) và đảm bảo tính đồng nhất trong quá trình phát triển.

---

## 1. Backend Stack (Java / Spring Boot)

### Core Technologies
| Công nghệ | Phiên bản chốt | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Java** | `21 (LTS)` | Phiên bản LTS tiêu chuẩn bắt buộc cho Spring Boot 4.x. Hỗ trợ Virtual Threads (Project Loom) giúp tăng hiệu năng xử lý bất đồng bộ cho thuật toán Auto Scheduling và Redis Lock. |
| **Spring Boot** | `4.1.0` | Phiên bản Stable mới nhất (2026). Cập nhật các tính năng mới nhất của Spring Framework 7.x, tối ưu hóa bộ nhớ, tốc độ khởi động và hỗ trợ native AOT. |
| **Spring Security** | `7.0.x` | Tích hợp mặc định với Spring Boot 4.1.0, hỗ trợ mạnh mẽ RBAC, OAuth2/JWT và các tiêu chuẩn bảo mật mới nhất. |
| **Spring Data JPA** | `4.0.x` | ORM chuẩn mực, tương thích hoàn toàn với Jakarta EE 11, giảm thiểu boilerplate code. |

### Database & Middleware
| Công nghệ | Phiên bản chốt | Lý do lựa chọn |
| :--- | :--- | :--- |
| **PostgreSQL** | `16.4` | Database quan hệ mạnh mẽ, hỗ trợ JSONB (lưu trữ linh hoạt), PostGIS (mở rộng cho tính toán GPS/Geofence nếu cần). Ổn định và miễn phí. |
| **Redis** | `7.4.0` | In-memory data store. Dùng làm Cache và **Distributed Lock** (lệnh `SETNX`) để xử lý bài toán tranh chấp nhận Open Shift (NFR-03), đảm bảo nguyên tắc First Valid First Served. |

### Auxiliary Libraries (Backend)
| Thư viện | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Flyway** | `10.17.0` | Database Migration. Quản lý version schema DB, đồng bộ cấu trúc DB giữa các thành viên và môi trường (Dev/Prod). |
| **Springdoc OpenAPI** | `2.6.0` | Tự động sinh tài liệu Swagger UI từ code. Tương thích hoàn toàn với Spring Boot 4 / Spring MVC 7. Giúp Frontend/Mobile dễ dàng tích hợp API. |
| **JJWT (Java JWT)** | `0.12.6` | Thư viện chuẩn để tạo, ký và xác thực JWT Token (Access & Refresh Token) cho luồng đăng nhập bằng CCCD. |
| **Firebase Admin SDK** | `9.3.0` | Gửi Push Notification (FCM) từ Backend xuống Mobile App một cách bảo mật và tin cậy. |
| **Lettuce** | `7.2.x` | Redis client mặc định của Spring Boot 4, hỗ trợ Reactive và Distributed Lock. |
| **Lombok** | `1.18.34` | Giảm thiểu getter/setter/constructor, giúp code Entity và DTO gọn gàng. |

---

## 2. Frontend Web Stack (Manager / Admin Dashboard)

### Core Technologies
| Công nghệ | Phiên bản chốt | Lý do lựa chọn |
| :--- | :--- | :--- |
| **React.js** | `19.0.0` | Thư viện UI phổ biến nhất, ecosystem khổng lồ. Phiên bản 19 tối ưu hóa rendering và tương thích tốt nhất với các thư viện 3D hiện nay. |
| **Vite** | `5.4.0` | Build tool cực nhanh, thay thế hoàn toàn Create React App, hỗ trợ Hot Module Replacement (HMR) tức thì. |
| **TypeScript** | `5.5.4` | Bắt buộc dùng để đảm bảo an toàn kiểu dữ liệu (type-safe), giảm 80% lỗi runtime khi làm việc với API và State. |

### Auxiliary Libraries (Web & 3D Visualization)
| Thư viện | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Tailwind CSS** | `3.4.6` | Utility-first CSS, giúp build UI nhanh, đồng bộ design system. |
| **TanStack Query** | `5.51.1` | Quản lý Server State, caching, tự động retry và polling (cực kỳ quan trọng cho luồng Auto Scheduling polling). |
| **Zustand** | `4.5.4` | State management nhẹ, thay thế Redux để giảm boilerplate. |
| **Three.js** | `0.166.1` | Thư viện WebGL cốt lõi để render 3D. |
| **React Three Fiber** | `8.16.8` | React renderer cho Three.js, cho phép viết 3D bằng JSX (dùng cho Dashboard 3D Charts). |
| **Drei** | `9.109.2` | Bộ utility helpers cho R3F (Camera controls, 3D Text, Environment...). |

---

## 3. Mobile App Stack (Employee App)

### Core Technologies
| Công nghệ | Phiên bản chốt | Lý do lựa chọn |
| :--- | :--- | :--- |
| **React Native** | `0.75.0` | Framework cross-platform. **Lý do chọn thay vì Flutter:** Tận dụng lại 100% kiến thức React/TypeScript của team Web, giảm thiểu rủi ro và thời gian học ngôn ngữ mới (Dart). Codebase chia sẻ được logic và types với Web. |
| **Expo SDK** | `53.0.0` | Managed workflow của React Native. Giúp việc build, test trên thiết bị thật và đẩy lên Store dễ dàng hơn gấp 10 lần so với React Native CLI thuần. |

### Auxiliary Libraries (Mobile)
| Thư viện | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **expo-camera** | `15.0.3` | Quét mã QR Check-in/Check-out. |
| **expo-location** | `17.0.1` | Lấy tọa độ GPS để validate Geofence với Backend. |
| **expo-notifications** | `0.29.0` | Nhận và hiển thị Push Notification từ Firebase. |
| **expo-secure-store** | `14.0.0` | Lưu trữ an toàn Refresh Token và thông tin nhạy trên thiết bị (Keychain/Keystore). |
| **React Navigation** | `7.0.0` | Điều hướng (Routing) chuẩn mực cho Mobile App. |
| **Lottie-react-native** | `7.0.0` | Render animation 3D (JSON) cho các hiệu ứng Check-in thành công, Empty state (nhẹ hơn nhiều so với dùng Three.js trên mobile). |

---

## 4. Tóm tắt Lý do Lựa chọn Chiến lược (Strategic Decisions)

### 4.1. Tại sao chọn React Native thay vì Flutter cho Mobile?
1. **Tái sử dụng kiến thức (Knowledge Reuse):** Team đã nắm vững React, TypeScript và Hooks từ Web. Chuyển sang Flutter đồng nghĩa với việc phải học Dart, widget lifecycle mới, và state management mới (BLoC/Riverpod).
2. **Chia sẻ Codebase (Code Sharing):** Có thể dùng chung các file định nghĩa Type/Interface (DTOs) và logic xử lý ngày giờ (DateUtils) giữa Web và Mobile.
3. **Giảm rủi ro tiến độ (Risk Mitigation):** Với timeline 8 tuần code, việc dùng React Native giúp team tập trung 100% thời gian vào **nghiệp vụ (Business Logic)** thay vì mất 2-3 tuần đầu chỉ để làm quen framework.

### 4.2. Tại sao dùng Redis cho Distributed Lock?
Bài toán "2 nhân viên cùng nhận 1 ca trống (Open Shift) cùng lúc" (NFR-03) không thể giải quyết triệt để bằng Database Transaction thông thường do độ trễ (latency). Redis với lệnh `SETNX` (Set if Not eXists) và TTL cung cấp cơ chế khóa phân tán (Distributed Lock) nhanh, chính xác và chịu tải cao, đảm bảo nguyên tắc *First Valid First Served*.

### 4.3. Tại sao tích hợp 3D (Three.js) vào Web Dashboard?
Yêu cầu của đề tài là ứng dụng công nghệ mới và nâng cao trải nghiệm trực quan. Việc sử dụng **React Three Fiber** để 3D hóa các biểu đồ KPI (Labor Cost, Coverage) và bản đồ Geofence không chỉ tạo điểm nhấn kỹ thuật (Wow-factor) khi bảo vệ, mà còn giúp Manager dễ dàng quan sát dữ liệu đa chiều so với biểu đồ 2D truyền thống.