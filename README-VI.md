# Mini World Blueprint AI

## Đây là gì?
Website mẫu giúp tải nhiều ảnh chụp danh sách vật phẩm/công thức Mini World: CREATA, dùng Gemini để đọc tên vật phẩm, số lượng và nguyên liệu; sau đó tính nguyên liệu thô theo công thức nhiều tầng.

## Cần chuẩn bị
- Tài khoản Google AI Studio và Gemini API key.
- Nơi chạy ứng dụng Node.js 20+ (máy tính hoặc dịch vụ host hỗ trợ Node).
- Không đưa API key vào giao diện website hoặc gửi key cho người khác.

## Chạy trên máy tính
1. Giải nén ZIP.
2. Cài Node.js 20 trở lên.
3. Mở terminal trong thư mục dự án và chạy `npm install`.
4. Sao chép `.env.example` thành `.env`.
5. Mở `.env`, dán key vào sau `GEMINI_API_KEY=`.
6. Chạy `npm start`.
7. Mở `http://localhost:3000`.

## Đưa lên mạng
Đưa toàn bộ thư mục này lên một dịch vụ host Node.js. Đặt lệnh build (nếu được hỏi) là `npm install`, lệnh start là `npm start`, và thêm biến môi trường `GEMINI_API_KEY` trong phần Environment/Variables của host. Không commit hoặc tải file `.env` lên GitHub.

## Lưu ý
- Đây là bản MVP, chưa phải ứng dụng đã được triển khai công khai.
- AI có thể đọc nhầm số hoặc tên trong ảnh game. Luôn kiểm tra và sửa dữ liệu trước khi tính.
- Nên chụp ảnh rõ, không cắt mất tên/số lượng/công thức. Tải tối đa 60 ảnh mỗi lượt, máy chủ phân tích theo nhóm 6 ảnh.
- Hạn mức và chi phí Gemini phụ thuộc chính sách/tài khoản Google tại thời điểm sử dụng. Kiểm tra trang Google AI Studio trước khi dùng nhiều ảnh.
- Ảnh được gửi tới Gemini để phân tích. Không tải lên ảnh chứa thông tin riêng tư.
