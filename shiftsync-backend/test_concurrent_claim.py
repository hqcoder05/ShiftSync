import concurrent.futures
import requests
import sys
import time

# ----------------- CẤU HÌNH ----------------- #
BASE_URL = "http://localhost:8080/api"
STORE_ID = "YOUR_STORE_UUID_HERE"
SHIFT_ID = "YOUR_SHIFT_UUID_HERE"

# Token của 2 nhân viên khác nhau (để đóng giả là 2 người cùng claim)
TOKEN_EMPLOYEE_A = "YOUR_JWT_TOKEN_FOR_EMPLOYEE_A"
TOKEN_EMPLOYEE_B = "YOUR_JWT_TOKEN_FOR_EMPLOYEE_B"
# --------------------------------------------- #

def claim_shift(worker_name, token):
    url = f"{BASE_URL}/stores/{STORE_ID}/marketplace/shifts/{SHIFT_ID}/claim"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"[{worker_name}] Bắt đầu gửi request claim ca...")
    start_time = time.time()
    
    try:
        response = requests.post(url, headers=headers)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            print(f"✅ [{worker_name}] THÀNH CÔNG! Đã nhận được ca. (Mất {elapsed:.3f}s)")
        else:
            try:
                error_msg = response.json().get('message', 'Không rõ lỗi')
            except:
                error_msg = response.text
            print(f"❌ [{worker_name}] THẤT BẠI! Status: {response.status_code}, Message: {error_msg} (Mất {elapsed:.3f}s)")
            
    except Exception as e:
        print(f"⚠️ [{worker_name}] Lỗi khi gọi API: {str(e)}")

def main():
    if "YOUR_STORE_UUID_HERE" in STORE_ID or "YOUR_JWT_TOKEN" in TOKEN_EMPLOYEE_A:
        print("Vui lòng cập nhật cấu hình STORE_ID, SHIFT_ID và JWT TOKENs trong file trước khi chạy!")
        sys.exit(1)

    print("=== BẮT ĐẦU TEST CONCURRENT CLAIM SHIFT ===")
    
    # Sử dụng ThreadPoolExecutor để chạy đồng thời 2 request
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(claim_shift, "Nhân viên A", TOKEN_EMPLOYEE_A)
        future_b = executor.submit(claim_shift, "Nhân viên B", TOKEN_EMPLOYEE_B)
        
        # Chờ cả 2 hoàn tất
        concurrent.futures.wait([future_a, future_b])
        
    print("=== KẾT THÚC TEST ===")

if __name__ == "__main__":
    main()
