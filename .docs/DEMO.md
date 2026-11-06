# Hướng dẫn demo TaskFlow

Bộ dữ liệu demo gồm 16 nhân sự, 4 dự án, 105 task, 147 logwork. Mọi tài khoản dùng chung mật khẩu `123456`.

## 1. Tài khoản

| Vai trò | Họ tên | Email | Dự án tham gia |
|---|---|---|---|
| Admin | Nguyễn Văn Dũng | dungnv@gmail.com | Không tham gia dự án |
| CEO | Lê Hồng Nhung | nhunglh@gmail.com | Xem được cả 4 dự án |
| Project Manager | Vũ Phương Anh | anhvp@gmail.com | Medibook, ShopViet |
| Project Manager | Trần Minh Quân | quantm@gmail.com | Cổng nhân sự, Quản lý kho |
| Team Leader | Ngô Quang Huy | huynq@gmail.com | Medibook, Quản lý kho |
| Team Leader | Bùi Thu Trang | trangbt@gmail.com | ShopViet, Quản lý kho |
| Team Leader | Hoàng Mạnh Cường | cuonghm@gmail.com | Cổng nhân sự, ShopViet |
| Employee | Nguyễn Đức Thắng | thangnd@gmail.com | Medibook, ShopViet, Quản lý kho |
| Employee | Trịnh Thu Hà | hatt@gmail.com | Medibook, ShopViet, Quản lý kho |
| Employee | Trần Quốc Bảo | baotq@gmail.com | Cổng nhân sự, ShopViet, Quản lý kho |
| Employee | Nguyễn Thị Thảo | thaont@gmail.com | Cổng nhân sự, ShopViet, Quản lý kho |
| Employee | Đỗ Thị Mai | maidt@gmail.com | Medibook, Cổng nhân sự |
| Employee | Phan Anh Tuấn | tuanpa@gmail.com | Cả 4 dự án |
| Intern | Phùng Thị Oanh | oanhpt@gmail.com | Medibook |
| Intern | Trần Bảo Ngọc | ngoctb@gmail.com | Cổng nhân sự |
| Intern | Đặng Hữu Phước | phuocdh@gmail.com | ShopViet, Quản lý kho |

Ảnh đại diện lấy từ bộ ảnh có sẵn và khớp giới tính với tên. Toàn bộ nội dung dự án, task, bình luận đều bằng tiếng Việt.

## 2. Bốn dự án

| Dự án | Loại | Trạng thái | Điểm nên cho xem |
|---|---|---|---|
| Ứng dụng đặt lịch khám Medibook | Kanban | Đang chạy | Sprint Nhắc lịch khám đang chạy, có task quá hạn |
| Cổng thông tin nhân sự nội bộ | Kanban | Đang chạy | Luồng bình luận bàn về phê duyệt hai cấp |
| Nền tảng thương mại điện tử ShopViet | Kanban | Có rủi ro | Nhiều task quá hạn ở khâu thanh toán |
| Hệ thống quản lý kho thông minh | Waterfall | Đang chạy | Cây công việc theo giai đoạn và biểu đồ Gantt |

Mỗi dự án Kanban có 2 sprint đã đóng, 1 sprint đang chạy, 1 sprint dự kiến và một nhóm task ở backlog.

## 3. Kịch bản demo

Thời lượng gợi ý khoảng 15 phút. Mỗi bước nên đổi tài khoản để thấy phân quyền.

### Bước 1. Admin quản trị hệ thống
1. Đăng nhập bằng Nguyễn Văn Dũng.
2. Mở danh sách người dùng, phòng ban, chức danh để thấy 16 nhân sự có ảnh đại diện.
3. Mở phần phân quyền để thấy 6 vai trò. Nhấn mạnh Admin không xem được dữ liệu dự án.

### Bước 2. CEO xem toàn cảnh
1. Đăng nhập bằng Lê Hồng Nhung.
2. Xem dashboard: tiến độ từng dự án, khối lượng công việc, giờ làm đã duyệt.
3. Mở ShopViet để thấy dự án có rủi ro, sau đó mở Quản lý kho để so sánh.

### Bước 3. Project Manager điều hành dự án Kanban
1. Đăng nhập bằng Vũ Phương Anh, mở Medibook.
2. Xem bảng Kanban và sprint Nhắc lịch khám đang chạy. Chỉ vào task quá hạn "Sửa lỗi hiển thị sai múi giờ khi đặt lịch" và đọc bình luận bên trong.
3. Tạo một task mới trong sprint Nhắc lịch khám, gán cho Nguyễn Đức Thắng, chọn mức ưu tiên và ước tính giờ.
4. Mở tab thành viên để thấy vai trò từng người trong dự án.

### Bước 4. Nhân viên ghi logwork
1. Đăng nhập bằng Nguyễn Đức Thắng, mở Medibook.
2. Mở task vừa được gán, đổi trạng thái sang đang làm.
3. Ghi một logwork 3 giờ với tiến độ 50 phần trăm.
4. Mở thông báo để thấy các task được giao và logwork đã duyệt.

### Bước 5. Project Manager duyệt logwork
1. Quay lại Vũ Phương Anh, mở danh sách logwork chờ duyệt.
2. Duyệt logwork của Thắng vừa gửi.
3. Từ chối một logwork khác và nhập lý do. Thắng sẽ nhận thông báo bị từ chối.
4. Lưu ý quy tắc: không tự duyệt logwork của chính mình.

### Bước 6. Dự án Waterfall và Gantt
1. Đăng nhập bằng Trần Minh Quân, mở Hệ thống quản lý kho thông minh.
2. Mở cây công việc: 5 giai đoạn, mỗi giai đoạn có các công việc con. Giai đoạn 1 và 2 đã xong, giai đoạn 3 đang làm.
3. Mở biểu đồ Gantt để xem tiến độ theo thời gian và công việc "Kiểm thử đơn vị các module" đã quá hạn.
4. Chỉ ra rằng chỉ ghi logwork được ở công việc con. Công việc cha tự tổng hợp giờ và trạng thái.

### Bước 7. Phân quyền theo vai trò
1. Đăng nhập bằng Phùng Thị Oanh, vai trò Intern. Chỉ thấy Medibook và các task liên quan đến mình.
2. Đăng nhập bằng Hoàng Mạnh Cường, vai trò Team Leader. Giao việc và duyệt logwork được nhưng không tạo hay sửa dự án.

## 4. Lưu ý khi demo

- Mốc thời gian dữ liệu tính quanh ngày 06/11/2026. Nếu demo muộn hơn nhiều, dữ liệu sẽ trông cũ hơn và nên sinh lại.
- Dự án ShopViet cố ý chậm tiến độ để minh họa cảnh báo rủi ro.
- Có 27 logwork đang chờ duyệt, dồn ở các dự án đang chạy để bước duyệt không bị trống.

## 5. Nạp lại dữ liệu demo

Chạy ở thư mục gốc dự án, khi stack đang chạy. Với môi trường dev, thêm tên container: `bash database/reset_demo.sh taskflow-dev-mysql-1`.

```bash
# 1. Sinh lại backup.sql và demo_users.json, chỉ cần khi sửa nội dung trong database/demo_content.py
python3 database/generate_demo.py

# 2. Xóa dữ liệu nghiệp vụ và nạp lại, giữ nguyên vai trò và quyền
bash database/reset_demo.sh

# 3. Đẩy ảnh đại diện lên Azure Blob
docker exec taskflow-prod-backend-1 mkdir -p /tmp/demo
docker cp database/avatars taskflow-prod-backend-1:/tmp/demo/avatars
docker cp database/demo_users.json database/upload_avatars.py taskflow-prod-backend-1:/tmp/demo/
docker exec taskflow-prod-backend-1 python /tmp/demo/upload_avatars.py /tmp/demo
docker exec taskflow-prod-backend-1 rm -rf /tmp/demo
```

Với môi trường mới, `database/seed.sh` vẫn nạp `backup.sql` tự động khi bảng người dùng còn trống. Ảnh đại diện vẫn cần chạy bước 3.
