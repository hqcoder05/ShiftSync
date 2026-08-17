# Hướng Dẫn Cài Đặt Và Chạy ShiftSync Backend (Từ Con Số 0)

Tài liệu này dành cho máy tính **chưa từng cài đặt công cụ lập trình nào**. Hãy làm theo từng bước để có thể chạy được dự án ShiftSync Backend.

---

## Phần 1: Cài đặt các công cụ cần thiết (Prerequisites)

Bạn cần cài đặt Git, Java 21 (JDK), Maven và Docker. Dưới đây là hướng dẫn theo từng hệ điều hành:

### 1. Dành cho Windows
- **Git:** Tải và cài đặt từ [Git for Windows](https://git-scm.com/download/win).
- **Java 21:** 
  - Tải [Eclipse Temurin JDK 21 (.msi)](https://adoptium.net/temurin/releases/?version=21). 
  - Khi cài đặt, chọn "Will be installed on local hard drive" ở mục **"Set JAVA_HOME variable"** để tự động cấu hình biến môi trường.
- **Maven:** 
  - Tải file zip từ [Apache Maven](https://maven.apache.org/download.cgi) và giải nén (VD: `C:\apache-maven-3.9.x`).
  - Mở Environment Variables, thêm đường dẫn `C:\apache-maven-3.9.x\bin` vào biến `Path`.
- **Docker Desktop:** Tải và cài đặt [Docker Desktop cho Windows](https://docs.docker.com/desktop/install/windows-install/).

### 2. Dành cho macOS
- **Cách nhanh nhất (Sử dụng Homebrew):**
  Mở Terminal và chạy các lệnh sau:
  ```bash
  # Cài đặt Homebrew (nếu chưa có)
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  
  # Cài đặt Git và Maven
  brew install git maven
  
  # Cài đặt Java 21
  brew install openjdk@21
  sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
  
  # Cài đặt Docker Desktop
  brew install --cask docker
  ```
  Sau khi cài xong, mở ứng dụng Docker trong Launchpad để khởi động.

### 3. Dành cho Linux (Ubuntu/Debian)
Mở Terminal và chạy các lệnh sau:
```bash
# Cập nhật package list
sudo apt update

# Cài đặt Git
sudo apt install git -y

# Cài đặt Java 21
sudo apt install openjdk-21-jdk -y

# Cài đặt Maven
sudo apt install maven -y

# Cài đặt Docker và Docker Compose
sudo apt install docker.io docker-compose-v2 -y
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Lưu ý: Với Linux, bạn cần đăng xuất và đăng nhập lại sau khi add user vào group docker)*.

### Kiểm tra cài đặt (Dành cho mọi HĐH)
Mở Terminal (hoặc Command Prompt) mới và gõ các lệnh sau để đảm bảo mọi thứ đã được cài đặt thành công:
```bash
git --version
java -version    # Phải báo phiên bản 21.x.x
mvn -version
docker --version
```

---

## Phần 2: Khởi chạy dự án

### Bước 1: Tải mã nguồn (Clone Source Code)
1. Mở Command Prompt (hoặc Git Bash).
2. Di chuyển đến thư mục bạn muốn lưu code, ví dụ: `cd D:\`
3. Gõ lệnh:
   ```bash
   git clone <URL_CUA_REPO_GITHUB_CUA_BAN>
   ```
4. Di chuyển vào thư mục code:
   ```bash
   cd ShiftSync\shiftsync-backend
   ```

### Bước 2: Chạy dự án (Chọn 1 trong 2 cách)

Đảm bảo ứng dụng **Docker Desktop đang được mở và hoạt động** trước khi thực hiện.

👉 **LƯU Ý QUAN TRỌNG TRƯỚC KHI CHẠY:**
Hệ thống yêu cầu các biến môi trường để hoạt động. Trong thư mục `shiftsync-backend`, hãy **Copy file `.env.example` và đổi tên bản sao thành `.env`**. (Bạn có thể để nguyên các giá trị mặc định bên trong file `.env` nếu chỉ muốn chạy thử ở local).

#### Cách 1: Chạy toàn bộ bằng Docker (Khuyên dùng nhất - Nhanh gọn)
Nếu bạn chỉ muốn bật hệ thống lên để xem và test API mà không có nhu cầu sửa code ngay, hãy dùng cách này. Docker sẽ tự động bật Database, Redis và cả Backend của chúng ta.

Tại thư mục `shiftsync-backend`, chạy lệnh:
```bash
docker compose up -d --build
```
Chờ một chút để Docker tải ảnh và khởi động (có thể mất vài phút cho lần đầu). Khi chạy xong, ứng dụng đã hoàn toàn sẵn sàng!

#### Cách 2: Chạy ở chế độ Lập trình / Debug (Dev Mode)
Nếu bạn là Coder, muốn trực tiếp gõ lệnh chạy Backend bằng Java để sửa code và xem log lỗi, hãy làm theo cách này (Chỉ dùng Docker để chạy DB và Redis).

1. Bật Database và Redis (không bật Backend trong Docker):
   ```bash
   docker compose up -d postgres redis
   ```
2. Tải thư viện và chạy ứng dụng Spring Boot bằng Maven:
   ```bash
   mvn spring-boot:run
   ```
*(Quá trình tải thư viện lần đầu sẽ hơi lâu, hãy kiên nhẫn)*.
Nếu bạn thấy dòng chữ `Started ShiftsyncBackendApplication in x seconds`, xin chúc mừng, server đã chạy thành công!

---

## Phần 3: Kiểm tra API

Mở trình duyệt web của bạn và truy cập vào địa chỉ sau để xem tài liệu API (Swagger UI):

👉 **http://localhost:8080/swagger-ui.html**

Tại đây, bạn có thể xem tất cả các API của dự án (Auth, User, Store) và có thể click "Try it out" để test trực tiếp!

---

## Các lệnh xử lý sự cố thường gặp (Troubleshooting)

**1. Lỗi "Port 8080 was already in use" khi chạy Maven:**
Lỗi này chắc chắn xảy ra nếu bạn vừa chạy Cách 1 xong lại nhảy sang chạy Cách 2. Do ứng dụng đang chạy ngầm trong Docker chiếm cổng 8080.
- Xử lý: Tắt Backend trong Docker bằng lệnh `docker stop shiftsync-backend`, rồi chạy lại Maven.

**2. Tắt dự án:** 
- Nếu dùng **Cách 1**, hãy vào thư mục `shiftsync-backend` và gõ: `docker compose down`
- Nếu dùng **Cách 2**, nhấn `Ctrl + C` ở cửa sổ cmd đang chạy Maven, sau đó gõ `docker compose down` để tắt CSDL.

**3. Reset lại toàn bộ Data của Database:**
Trường hợp dữ liệu bị lỗi, bạn có thể xoá sạch database đi để tạo lại từ đầu bằng lệnh:
```bash
docker compose down -v
docker compose up -d
```
(Lưu ý: Hành động này sẽ xoá toàn bộ dữ liệu bạn đã tạo thử nghiệm).
