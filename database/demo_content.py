"""Nội dung thô của bộ dữ liệu demo: nhân sự, dự án, task, bình luận.

File này chỉ chứa dữ liệu. Logic sinh SQL nằm ở generate_demo.py.
Quy ước: không dùng dấu ngoặc đơn trong nội dung, riêng cú pháp nhắc tên {@key}
sẽ được đổi thành @[Họ tên](usr-id).
"""

# (key, họ tên, giới tính ảnh, file ảnh, role_id, phòng ban, chức danh, email)
# role_id: 1 Admin, 2 CEO, 3 Project Manager, 4 Team Leader, 5 Employee, 6 Intern
USERS = [
    ("drew", "Nguyễn Văn Dũng", "male", "drew-cano", 1, None, None, "dungnv@gmail.com"),
    ("olivia", "Lê Hồng Nhung", "female", "olivia-rhye", 2, 1, 1, "nhunglh@gmail.com"),
    ("lana", "Vũ Phương Anh", "female", "lana-steiner", 3, 3, 2, "anhvp@gmail.com"),
    ("ethan", "Trần Minh Quân", "male", "ethan-campbell", 3, 3, 2, "quantm@gmail.com"),
    ("noah", "Ngô Quang Huy", "male", "noah-pierre", 4, 2, 3, "huynq@gmail.com"),
    ("sophia", "Bùi Thu Trang", "female", "sophia-perez", 4, 5, 10, "trangbt@gmail.com"),
    ("joshua", "Hoàng Mạnh Cường", "male", "joshua-wilson", 4, 2, 3, "cuonghm@gmail.com"),
    ("natali", "Nguyễn Thị Thảo", "female", "natali-craig", 5, 3, 8, "thaont@gmail.com"),
    ("riley", "Nguyễn Đức Thắng", "male", "riley-moore", 5, 2, 4, "thangnd@gmail.com"),
    ("amelie", "Trịnh Thu Hà", "female", "amelie-laurent", 5, 2, 5, "hatt@gmail.com"),
    ("owen", "Trần Quốc Bảo", "male", "owen-garcia", 5, 2, 4, "baotq@gmail.com"),
    ("candice", "Đỗ Thị Mai", "female", "candice-wu", 5, 4, 6, "maidt@gmail.com"),
    ("cameron", "Phan Anh Tuấn", "male", "cameron-yang", 5, 5, 7, "tuanpa@gmail.com"),
    ("katherine", "Phùng Thị Oanh", "female", "katherine-moss", 6, 2, 9, "oanhpt@gmail.com"),
    ("sienna", "Trần Bảo Ngọc", "female", "sienna-hewitt", 6, 4, 9, "ngoctb@gmail.com"),
    ("ashwin", "Đặng Hữu Phước", "male", "ashwin-santiago", 6, 5, 9, "phuocdh@gmail.com"),
]

DEPARTMENTS = [
    (1, "Điều hành", "Ban điều hành công ty"),
    (2, "Kỹ thuật", "Phát triển phần mềm, hạ tầng và dữ liệu"),
    (3, "Sản phẩm", "Phân tích nghiệp vụ và quản lý dự án"),
    (4, "Thiết kế", "Thiết kế giao diện và trải nghiệm người dùng"),
    (5, "Kiểm thử", "Đảm bảo chất lượng sản phẩm"),
]

JOB_TITLES = [
    (1, "Giám đốc điều hành", "Điều hành toàn bộ công ty"),
    (2, "Quản lý dự án", "Chịu trách nhiệm tiến độ và chất lượng dự án"),
    (3, "Trưởng nhóm kỹ thuật", "Điều phối nhóm phát triển"),
    (4, "Lập trình viên Backend", "Phát triển máy chủ và cơ sở dữ liệu"),
    (5, "Lập trình viên Frontend", "Phát triển giao diện người dùng"),
    (6, "Chuyên viên thiết kế", "Thiết kế giao diện và trải nghiệm"),
    (7, "Kỹ sư kiểm thử", "Viết và thực hiện kịch bản kiểm thử"),
    (8, "Phân tích nghiệp vụ", "Thu thập và phân tích yêu cầu"),
    (9, "Thực tập sinh", "Hỗ trợ và học việc trong dự án"),
    (10, "Trưởng nhóm kiểm thử", "Điều phối nhóm kiểm thử"),
]

# Nhãn hiển thị của thành viên trong dự án
POSITIONS = {
    "lana": "Quản lý dự án", "ethan": "Quản lý dự án",
    "noah": "Trưởng nhóm kỹ thuật", "sophia": "Trưởng nhóm kiểm thử", "joshua": "Trưởng nhóm kỹ thuật",
    "natali": "Phân tích nghiệp vụ", "riley": "Lập trình viên Backend", "owen": "Lập trình viên Backend",
    "amelie": "Lập trình viên Frontend", "candice": "Chuyên viên thiết kế", "cameron": "Kỹ sư kiểm thử",
    "katherine": "Thực tập sinh", "sienna": "Thực tập sinh", "ashwin": "Thực tập sinh",
}

# Mẫu nội dung logwork theo loại công việc: (tiêu đề, nội dung). Viết như ghi chú công việc thực tế,
# không nhắc lại tên task. Mỗi task dùng các mẫu khác nhau cho từng lần ghi.
LOG_TEMPLATES = {
    "ba": [
        ("Họp làm rõ yêu cầu", "Họp với bên nghiệp vụ để thống nhất phạm vi, ghi lại các điểm còn chưa rõ và danh sách câu hỏi cần xác nhận thêm."),
        ("Viết đặc tả", "Hoàn thiện đặc tả luồng xử lý, các quy tắc nghiệp vụ và trường hợp ngoại lệ, gửi nhóm đọc thử."),
        ("Tổng hợp góp ý", "Gom phản hồi của các bên sau buổi trình bày, cập nhật lại tài liệu và đánh dấu những điểm đã chốt."),
        ("Vẽ sơ đồ quy trình", "Vẽ lại sơ đồ quy trình hiện tại và quy trình mong muốn để so sánh, chỉ ra các bước có thể bỏ."),
        ("Rà soát tài liệu", "Đọc lại toàn bộ tài liệu, sửa các chỗ mâu thuẫn giữa các mục và thống nhất thuật ngữ."),
    ],
    "ui": [
        ("Dựng bản phác thảo", "Phác thảo nhanh các màn hình chính và luồng chuyển giữa chúng để nhóm góp ý sớm."),
        ("Hoàn thiện bản thiết kế", "Chuẩn hóa màu sắc, cỡ chữ, khoảng cách và dựng thêm trạng thái rỗng, trạng thái lỗi."),
        ("Sửa theo góp ý", "Chỉnh lại bố cục theo nhận xét của quản lý dự án và đội lập trình, cập nhật bản thiết kế mới."),
        ("Chuẩn bị bàn giao", "Đặt tên lớp rõ ràng, xuất hình ảnh và ghi chú kích thước để đội lập trình dùng ngay."),
        ("Thử trên nhiều kích thước", "Kiểm tra lại thiết kế trên màn hình nhỏ và lớn, sửa những chỗ bị tràn hoặc quá chật."),
    ],
    "be": [
        ("Cài đặt xử lý chính", "Viết phần xử lý chính, kiểm tra dữ liệu đầu vào và trả mã lỗi rõ ràng khi dữ liệu sai."),
        ("Viết kiểm thử", "Bổ sung kiểm thử cho các trường hợp thường gặp và trường hợp biên, chạy lại toàn bộ đều qua."),
        ("Tối ưu truy vấn", "Đo thời gian truy vấn, thêm chỉ mục còn thiếu và bỏ bớt truy vấn lặp, thời gian giảm rõ rệt."),
        ("Sửa theo review", "Chỉnh lại code theo nhận xét của người review, tách bớt hàm quá dài và đặt lại tên cho dễ đọc."),
        ("Xử lý lỗi phát sinh", "Tìm nguyên nhân và sửa các lỗi phát hiện khi chạy thử trên môi trường kiểm thử."),
        ("Cập nhật tài liệu API", "Bổ sung mô tả tham số, ví dụ yêu cầu, phản hồi và danh sách mã lỗi để đội giao diện dùng."),
    ],
    "fe": [
        ("Dựng giao diện", "Dựng các thành phần giao diện theo bản thiết kế và nối với dữ liệu từ API."),
        ("Xử lý trạng thái", "Thêm trạng thái đang tải, danh sách rỗng và thông báo lỗi để người dùng không bị trống màn hình."),
        ("Chỉnh cho màn hình nhỏ", "Căn lại bố cục trên điện thoại và máy tính bảng, sửa các chỗ chữ bị tràn."),
        ("Sửa theo góp ý", "Sửa các điểm lệch so với thiết kế mà bên thiết kế và kiểm thử đã ghi nhận."),
        ("Kiểm tra biểu mẫu", "Thêm kiểm tra dữ liệu nhập, hiển thị lỗi ngay dưới từng ô và chặn gửi khi còn thiếu."),
    ],
    "qa": [
        ("Soạn kịch bản kiểm thử", "Viết các ca kiểm thử cho luồng chính và các trường hợp lỗi, chuẩn bị sẵn dữ liệu mẫu."),
        ("Chạy kiểm thử", "Chạy lần lượt các ca đã soạn, ghi lại kết quả và chụp màn hình những chỗ chưa đạt."),
        ("Báo lỗi và theo dõi", "Tạo báo cáo lỗi kèm các bước tái hiện, trao đổi với đội lập trình về mức độ ưu tiên."),
        ("Kiểm thử lại", "Kiểm tra lại các lỗi đã được sửa và chạy nhanh bộ kiểm thử hồi quy để chắc không phát sinh lỗi mới."),
    ],
    "doc": [
        ("Soạn nội dung", "Viết phần nội dung chính, sắp xếp lại các mục cho dễ theo dõi."),
        ("Bổ sung hình minh họa", "Thêm sơ đồ và ảnh chụp màn hình vào những chỗ khó hình dung."),
        ("Hoàn thiện và gửi duyệt", "Đọc lại, sửa lỗi chính tả và gửi cho người phụ trách duyệt."),
        ("Cập nhật theo phản hồi", "Sửa tài liệu theo góp ý của khách hàng và nhóm dự án."),
    ],
}

# Mô tả task: (tiêu đề, mô tả, loại, trạng thái, ưu tiên, giờ ước tính, người nhận, tùy chọn)
# Trạng thái chỉ cần ghi cho sprint đang chạy. Sprint đã đóng luôn là done, sprint dự kiến và backlog luôn là todo.
# Tùy chọn: st, dl (ghi đè ngày), rej (có logwork bị từ chối), cm (bình luận), att (tệp đính kèm)


def _t(title, desc, kind, prio, est, who, status="todo", **opt):
    return dict(title=title, desc=desc, kind=kind, prio=prio, est=est, who=who, status=status, opt=opt)


KANBAN_PROJECTS = [
    dict(
        name="Ứng dụng đặt lịch khám Medibook",
        desc="Ứng dụng giúp bệnh nhân tìm bác sĩ, đặt lịch khám và nhận nhắc lịch, kèm trang quản trị cho phòng khám.",
        status="active", pm="lana", start="2026-09-28", end="2027-01-29",
        members=["lana", "noah", "riley", "amelie", "cameron", "katherine", "candice"],
        sprints=[
            (1, "Nền tảng và đăng nhập", "Hoàn thành nền tảng đăng nhập và thiết kế luồng đặt lịch", "2026-09-28", "2026-10-11", "closed",
             "Đạt mục tiêu. Luồng đăng nhập chạy ổn định, thiết kế được khách hàng chấp thuận."),
            (2, "Tìm bác sĩ và đặt lịch", "Có thể tìm bác sĩ và đặt lịch khám cơ bản", "2026-10-12", "2026-10-25", "closed",
             "Đạt mục tiêu. API đặt lịch đã chống được trùng khung giờ, còn một số góp ý nhỏ về giao diện."),
            (3, "Nhắc lịch khám", "Hoàn thiện luồng đặt lịch và nhắc lịch khám", "2026-10-26", "2026-11-08", "active", None),
            (4, "Thanh toán và đánh giá", "Thanh toán trực tuyến và đánh giá bác sĩ", "2026-11-09", "2026-11-22", "planned", None),
        ],
        tasks={
            1: [
                _t("Khảo sát quy trình đặt lịch tại phòng khám", "Tìm hiểu cách phòng khám đang nhận lịch qua điện thoại và sổ tay để chuyển thành luồng số.", "ba", "high", 8, ["noah"]),
                _t("Thiết kế luồng đặt lịch và màn hình chọn bác sĩ", "Dựng luồng màn hình từ chọn chuyên khoa đến xác nhận lịch hẹn.", "ui", "high", 12, ["candice"],
                   att=("luong-dat-lich-medibook.fig", "candice")),
                _t("Thiết kế cơ sở dữ liệu lịch hẹn và bác sĩ", "Mô hình hóa bác sĩ, chuyên khoa, ca làm việc và lịch hẹn.", "be", "high", 8, ["riley"]),
                _t("Xây dựng API đăng ký và đăng nhập bệnh nhân", "Đăng ký bằng số điện thoại, xác thực mã OTP và cấp token đăng nhập.", "be", "high", 12, ["riley"]),
                _t("Dựng khung ứng dụng và màn hình đăng nhập", "Khởi tạo dự án giao diện, điều hướng và màn hình đăng nhập.", "fe", "medium", 10, ["amelie"]),
                _t("Viết kịch bản kiểm thử luồng đăng nhập", "Liệt kê các ca đăng nhập đúng, sai mã OTP và hết hạn phiên.", "qa", "medium", 6, ["katherine"]),
            ],
            2: [
                _t("Xây dựng API tìm kiếm bác sĩ theo chuyên khoa", "Tìm bác sĩ theo chuyên khoa, tên và khung giờ còn trống.", "be", "high", 12, ["riley"]),
                _t("Màn hình danh sách bác sĩ và bộ lọc chuyên khoa", "Hiển thị danh sách bác sĩ, lọc theo chuyên khoa và đánh giá.", "fe", "high", 14, ["amelie"]),
                _t("Xây dựng API đặt lịch và chống trùng khung giờ", "Tạo lịch hẹn, kiểm tra khung giờ còn trống và không cho đặt trùng.", "be", "critical", 16, ["riley", "noah"],
                   cm=[("noah", "{@riley} nhớ khóa bản ghi khi kiểm tra khung giờ để tránh hai bệnh nhân đặt trùng nhau."),
                       ("riley", "Mình đã thêm ràng buộc duy nhất theo bác sĩ và giờ bắt đầu, đang chạy thử với 50 yêu cầu song song."),
                       ("lana", "Ổn rồi, nhớ ghi kết quả thử tải vào tài liệu để làm bằng chứng khi nghiệm thu.")]),
                _t("Thiết kế giao diện lịch hẹn của bệnh nhân", "Màn hình xem, đổi và hủy lịch hẹn đã đặt.", "ui", "medium", 8, ["candice"]),
                _t("Kiểm thử API tìm kiếm bác sĩ", "Kiểm tra kết quả tìm kiếm theo từng bộ lọc và khi không có dữ liệu.", "qa", "medium", 6, ["cameron"]),
                _t("Viết tài liệu API cho đội di động", "Tổng hợp các endpoint đã có thành tài liệu dễ tra cứu.", "doc", "low", 4, ["katherine"],
                   att=("medibook-api.pdf", "katherine")),
            ],
            3: [
                _t("Màn hình chọn khung giờ khám", "Hiển thị khung giờ còn trống theo ngày, tự làm mới khi có người đặt.", "fe", "high", 12, ["amelie"], "done"),
                _t("Gửi email xác nhận lịch hẹn", "Gửi email xác nhận kèm mã lịch hẹn và địa chỉ phòng khám.", "be", "medium", 8, ["riley"], "done"),
                _t("Nhắc lịch khám qua thông báo đẩy", "Gửi thông báo nhắc trước 24 giờ và 2 giờ so với giờ khám.", "be", "high", 14, ["riley", "noah"], "in_progress"),
                _t("Màn hình lịch sử đặt lịch", "Liệt kê lịch hẹn đã qua và sắp tới, cho phép xem chi tiết.", "fe", "medium", 10, ["amelie"], "in_progress"),
                _t("Kiểm thử luồng đặt lịch từ đầu đến cuối", "Chạy toàn bộ luồng từ tìm bác sĩ đến nhận email xác nhận trên nhiều thiết bị.", "qa", "critical", 12, ["cameron", "katherine"], "in_progress",
                   rej=True,
                   cm=[("cameron", "{@amelie} màn hình chọn giờ bị lệch một dòng trên máy màn hình nhỏ, bạn xem giúp nhé."),
                       ("amelie", "Mình đã nhận, chiều nay sẽ sửa xong.")]),
                _t("Sửa lỗi hiển thị sai múi giờ khi đặt lịch", "Một số bệnh nhân thấy giờ khám lệch 7 tiếng so với lịch thực tế.", "be", "critical", 6, ["riley"], "in_progress",
                   dl="2026-11-03",
                   cm=[("lana", "{@riley} lỗi múi giờ đang ảnh hưởng nhiều bệnh nhân, bạn cập nhật tiến độ giúp mình trước 3 giờ chiều nay."),
                       ("riley", "Nguyên nhân là máy chủ lưu giờ UTC còn ứng dụng đọc theo giờ máy. Chiều nay mình đưa bản vá.")]),
                _t("Thiết kế giao diện hồ sơ bệnh nhân", "Màn hình thông tin cá nhân, tiền sử khám và người thân đi cùng.", "ui", "medium", 8, ["candice"], "todo"),
                _t("Chức năng hủy và đổi lịch hẹn", "Cho phép hủy hoặc đổi giờ trước giờ khám tối thiểu 4 tiếng.", "be", "high", 12, ["noah"], "todo"),
            ],
            4: [
                _t("Thanh toán phí khám trực tuyến", "Tích hợp ví điện tử để thanh toán phí đặt cọc khi đặt lịch.", "be", "high", 20, ["riley"]),
                _t("Màn hình đánh giá bác sĩ sau khám", "Cho bệnh nhân chấm điểm và viết nhận xét sau buổi khám.", "fe", "medium", 10, ["amelie"]),
                _t("Kiểm thử hiệu năng khi nhiều người đặt lịch cùng lúc", "Thử tải 500 người dùng đồng thời vào khung giờ cao điểm.", "qa", "high", 10, ["cameron"]),
            ],
            0: [
                _t("Hỗ trợ tiếng Anh cho giao diện", "Thêm bản dịch tiếng Anh cho toàn bộ màn hình.", "fe", "low", 16, []),
                _t("Tích hợp bản đồ chỉ đường đến phòng khám", "Hiển thị vị trí phòng khám và chỉ đường từ vị trí hiện tại.", "fe", "low", 12, []),
                _t("Báo cáo thống kê lịch hẹn cho quản trị phòng khám", "Thống kê số lịch hẹn, tỉ lệ hủy và giờ cao điểm.", "be", "medium", 16, []),
            ],
        },
    ),
    dict(
        name="Cổng thông tin nhân sự nội bộ",
        desc="Cổng tự phục vụ cho nhân viên: xin nghỉ phép, xem bảng công, đăng ký làm thêm giờ và nhận thông báo nội bộ.",
        status="active", pm="ethan", start="2026-10-05", end="2027-01-29",
        members=["ethan", "joshua", "natali", "owen", "candice", "sienna", "cameron"],
        sprints=[
            (1, "Khởi động và hồ sơ nhân viên", "Phân tích yêu cầu, dựng nền tảng và hồ sơ nhân viên", "2026-10-05", "2026-10-18", "closed",
             "Đạt mục tiêu. Nền tảng đăng nhập một lần đã chạy trên môi trường thử."),
            (2, "Nghỉ phép và phê duyệt", "Hoàn thành luồng xin nghỉ phép và phê duyệt", "2026-10-19", "2026-11-01", "closed",
             "Đạt mục tiêu. Luồng phê duyệt hai cấp đã được phòng nhân sự thống nhất."),
            (3, "Bảng công và làm thêm giờ", "Bảng công, làm thêm giờ và báo cáo cho phòng nhân sự", "2026-11-02", "2026-11-15", "active", None),
            (4, "Thông báo và phân quyền", "Thông báo nội bộ, danh bạ và phân quyền theo phòng ban", "2026-11-16", "2026-11-29", "planned", None),
        ],
        tasks={
            1: [
                _t("Phân tích yêu cầu cổng thông tin nhân sự", "Làm việc với phòng nhân sự để chốt phạm vi và độ ưu tiên các chức năng.", "ba", "high", 10, ["natali"]),
                _t("Thiết kế hệ thống giao diện chung cho cổng", "Bộ màu, kiểu chữ và thành phần giao diện dùng chung cho mọi màn hình.", "ui", "high", 14, ["candice"]),
                _t("Dựng cấu trúc dự án và đăng nhập một lần", "Khởi tạo dịch vụ và tích hợp đăng nhập bằng tài khoản công ty.", "be", "high", 12, ["owen"]),
                _t("Màn hình hồ sơ nhân viên", "Hiển thị và cập nhật thông tin cá nhân, liên hệ khẩn cấp.", "fe", "medium", 12, ["joshua"]),
                _t("Soạn tài liệu quy trình nghỉ phép hiện tại", "Mô tả quy trình xin nghỉ đang làm bằng email và giấy.", "doc", "low", 5, ["sienna"]),
            ],
            2: [
                _t("API đơn xin nghỉ phép", "Tạo, sửa, hủy đơn và kiểm tra số ngày phép còn lại.", "be", "high", 14, ["owen"]),
                _t("Màn hình tạo đơn nghỉ phép", "Biểu mẫu chọn loại phép, ngày nghỉ và người bàn giao.", "fe", "high", 12, ["joshua"]),
                _t("Luồng phê duyệt đơn nghỉ phép hai cấp", "Trưởng nhóm duyệt trước, phòng nhân sự duyệt cuối.", "ba", "critical", 10, ["natali", "joshua"],
                   att=("so-do-phe-duyet-nghi-phep.pdf", "natali"),
                   cm=[("natali", "{@joshua} đề xuất là trưởng nhóm duyệt trước, phòng nhân sự duyệt cuối. Bạn xem sơ đồ đính kèm giúp mình."),
                       ("joshua", "Mình đồng ý, nhưng cần thêm nhánh tự động chuyển cấp khi người duyệt đang nghỉ phép."),
                       ("ethan", "Chốt theo hướng của {@joshua} nhé. {@natali} cập nhật lại tài liệu trong hôm nay.")]),
                _t("Thiết kế giao diện bảng công", "Bảng công theo tháng, tô màu ngày nghỉ, đi muộn và làm thêm.", "ui", "medium", 10, ["candice"]),
                _t("Kiểm thử luồng nghỉ phép", "Kiểm thử đơn hợp lệ, vượt số ngày phép và phê duyệt chéo cấp.", "qa", "medium", 8, ["cameron", "sienna"]),
                _t("Chuẩn bị dữ liệu mẫu cho môi trường thử", "Tạo dữ liệu nhân viên, phòng ban và số ngày phép để kiểm thử.", "be", "low", 4, ["sienna"]),
            ],
            3: [
                _t("API chấm công và tổng hợp bảng công tháng", "Nhận dữ liệu chấm công từ máy vân tay và tổng hợp theo tháng.", "be", "high", 16, ["owen"], "done"),
                _t("Màn hình bảng công cá nhân", "Nhân viên xem giờ vào ra và giờ làm thêm từng ngày.", "fe", "high", 12, ["joshua"], "done"),
                _t("Cổng đăng ký làm thêm giờ", "Biểu mẫu đăng ký làm thêm và gửi cho trưởng nhóm duyệt.", "fe", "medium", 12, ["joshua", "sienna"], "in_progress"),
                _t("Báo cáo tổng hợp công cho phòng nhân sự", "Tổng hợp công, phép và làm thêm của toàn công ty theo phòng ban.", "be", "high", 14, ["owen"], "in_progress",
                   cm=[("ethan", "{@owen} phòng nhân sự cần báo cáo này trước kỳ chốt công cuối tháng, bạn ưu tiên giúp mình."),
                       ("owen", "Phần tổng hợp đã xong, mình đang tối ưu truy vấn vì dữ liệu cả năm chạy hơi chậm.")]),
                _t("Kiểm thử bảng công và phép năm", "Đối chiếu số liệu bảng công với dữ liệu gốc của máy chấm công.", "qa", "high", 10, ["cameron"], "in_progress", rej=True),
                _t("Thiết kế màn hình tin tức và thông báo nội bộ", "Trang chủ hiển thị tin mới, sinh nhật và sự kiện sắp tới.", "ui", "medium", 8, ["candice"], "todo"),
                _t("Quy tắc tính số ngày phép còn lại", "Chốt cách cộng dồn phép năm, phép thâm niên và phép chuyển năm.", "ba", "high", 6, ["natali"], "todo"),
            ],
            4: [
                _t("API tin tức và thông báo nội bộ", "Đăng tin, ghim tin quan trọng và đánh dấu đã đọc.", "be", "medium", 12, ["owen"]),
                _t("Màn hình danh bạ nhân viên", "Tìm kiếm nhân viên theo tên, phòng ban và số điện thoại.", "fe", "medium", 10, ["joshua"]),
                _t("Phân quyền xem dữ liệu theo phòng ban", "Trưởng phòng chỉ xem dữ liệu nhân viên thuộc phòng mình.", "be", "critical", 16, ["owen", "joshua"]),
                _t("Kiểm thử phân quyền", "Kiểm tra từng vai trò chỉ thấy đúng dữ liệu được phép.", "qa", "high", 8, ["cameron"]),
            ],
            0: [
                _t("Xuất bảng công ra tệp Excel", "Cho phép phòng nhân sự tải bảng công theo mẫu có sẵn.", "be", "low", 8, []),
                _t("Ứng dụng di động cho cổng nhân sự", "Phiên bản di động để xin nghỉ và xem bảng công nhanh.", "fe", "low", 24, []),
                _t("Tích hợp lịch công ty vào lịch cá nhân", "Đồng bộ ngày nghỉ lễ và sự kiện vào lịch của nhân viên.", "be", "low", 10, []),
            ],
        },
    ),
    dict(
        name="Nền tảng thương mại điện tử ShopViet",
        desc="Sàn thương mại điện tử cho doanh nghiệp vừa và nhỏ: danh mục, giỏ hàng, thanh toán và khuyến mãi. Dự án đang chậm tiến độ ở khâu thanh toán.",
        status="at_risk", pm="lana", start="2026-10-05", end="2027-01-15",
        members=["lana", "joshua", "sophia", "riley", "owen", "amelie", "natali", "ashwin", "cameron"],
        sprints=[
            (1, "Danh mục sản phẩm", "Phân tích, kiến trúc và danh mục sản phẩm", "2026-10-05", "2026-10-18", "closed",
             "Đạt mục tiêu. Danh mục sản phẩm và trang chủ đã chạy trên môi trường thử."),
            (2, "Giỏ hàng và tìm kiếm", "Giỏ hàng, tìm kiếm và thanh toán thử nghiệm", "2026-10-19", "2026-11-01", "closed",
             "Hoàn thành giỏ hàng và tìm kiếm. Thanh toán thật chưa kịp nên chuyển sang sprint sau."),
            (3, "Thanh toán và tồn kho", "Hoàn thiện thanh toán thật và xử lý tồn kho", "2026-11-02", "2026-11-15", "active", None),
            (4, "Khuyến mãi và kiểm thử tải", "Khuyến mãi, đánh giá sản phẩm và kiểm thử tải", "2026-11-16", "2026-11-29", "planned", None),
        ],
        tasks={
            1: [
                _t("Phân tích yêu cầu gian hàng và đơn hàng", "Chốt quy trình từ lúc khách chọn hàng đến khi giao thành công.", "ba", "high", 10, ["natali"]),
                _t("Thiết kế kiến trúc dịch vụ và cơ sở dữ liệu", "Tách dịch vụ sản phẩm, đơn hàng, thanh toán và mô hình hóa dữ liệu.", "be", "high", 14, ["riley", "joshua"]),
                _t("API danh mục sản phẩm", "Quản lý danh mục, thuộc tính và hình ảnh sản phẩm.", "be", "high", 12, ["owen"]),
                _t("Giao diện trang chủ và danh mục", "Trang chủ, danh sách sản phẩm theo danh mục và phân trang.", "fe", "high", 14, ["amelie"]),
                _t("Kiểm thử API danh mục", "Kiểm tra thêm, sửa, xóa danh mục và sản phẩm.", "qa", "medium", 6, ["ashwin"]),
            ],
            2: [
                _t("API giỏ hàng", "Thêm, bớt, đổi số lượng và tính tạm tính giỏ hàng.", "be", "high", 12, ["owen"]),
                _t("Giao diện giỏ hàng", "Hiển thị giỏ hàng, mã giảm giá và tổng tiền.", "fe", "high", 12, ["amelie"]),
                _t("Tìm kiếm sản phẩm bằng từ khóa tiếng Việt có dấu", "Tìm \"ao so mi\" ra được \"áo sơ mi\" nhờ bộ phân tích tiếng Việt.", "be", "critical", 16, ["riley"]),
                _t("Tích hợp cổng thanh toán thử nghiệm", "Kết nối môi trường thử của cổng thanh toán để chạy luồng đầu tiên.", "be", "critical", 18, ["riley", "owen"]),
                _t("Kiểm thử luồng giỏ hàng và đặt hàng", "Kiểm thử từ thêm vào giỏ đến tạo đơn hàng thành công.", "qa", "high", 10, ["sophia", "ashwin"]),
            ],
            3: [
                _t("Giao diện trang chi tiết sản phẩm", "Ảnh, mô tả, biến thể và nút thêm vào giỏ.", "fe", "high", 12, ["amelie"], "done"),
                _t("Xử lý tồn kho khi nhiều đơn cùng lúc", "Đảm bảo không bán vượt số lượng tồn khi nhiều khách đặt cùng lúc.", "be", "critical", 16, ["riley", "owen"], "in_progress",
                   dl="2026-11-02",
                   cm=[("sophia", "{@riley} tối qua thử 200 đơn đồng thời vẫn thấy tồn kho âm ở 3 sản phẩm."),
                       ("riley", "Mình xác nhận lỗi này, đang chuyển sang khóa theo từng sản phẩm. Dự kiến trễ thêm 2 ngày."),
                       ("lana", "Mình ghi nhận rủi ro này vào báo cáo tuần. {@owen} hỗ trợ {@riley} phần kiểm thử tải nhé."),
                       ("owen", "Mình nhận, sẽ viết bộ thử tải ngay hôm nay.")]),
                _t("Tích hợp thanh toán thật với ngân hàng", "Chuyển từ môi trường thử sang cổng thanh toán thật, xử lý hoàn tiền.", "be", "critical", 20, ["riley"], "in_progress",
                   dl="2026-11-04", rej=True,
                   cm=[("lana", "{@riley} ngân hàng vừa gửi lại tài khoản thử nghiệm, bạn lấy trong thư mục chung rồi tích hợp tiếp."),
                       ("riley", "Đã nhận, mình chạy thử thành công giao dịch đầu tiên.")]),
                _t("Giao diện thanh toán và xác nhận đơn", "Chọn địa chỉ, phương thức thanh toán và trang xác nhận.", "fe", "high", 14, ["amelie"], "in_progress"),
                _t("Đối soát đơn hàng và hoàn tiền", "Quy tắc đối soát hằng ngày và hoàn tiền một phần.", "ba", "high", 8, ["natali"], "todo",
                   st="2026-11-02", dl="2026-11-05",
                   cm=[("natali", "Phần này đang chờ phòng kế toán xác nhận quy tắc hoàn tiền một phần, mình sẽ cập nhật ngay khi có phản hồi.")]),
                _t("Kiểm thử bảo mật luồng thanh toán", "Kiểm tra giả mạo số tiền, lặp giao dịch và lộ thông tin thẻ.", "qa", "critical", 12, ["sophia", "cameron"], "in_progress"),
                _t("Trang theo dõi trạng thái đơn hàng", "Hiển thị từng bước xử lý và vận chuyển của đơn hàng.", "fe", "medium", 10, ["amelie"], "todo"),
            ],
            4: [
                _t("Chương trình khuyến mãi và mã giảm giá", "Tạo mã giảm theo phần trăm, số tiền và điều kiện đơn tối thiểu.", "be", "high", 16, ["owen"]),
                _t("Đánh giá và bình luận sản phẩm", "Cho khách đã mua chấm sao và viết nhận xét.", "fe", "medium", 12, ["amelie"]),
                _t("Kiểm thử hiệu năng ngày khuyến mãi lớn", "Mô phỏng lượng truy cập gấp 10 lần ngày thường.", "qa", "high", 12, ["sophia", "cameron"]),
            ],
            0: [
                _t("Gợi ý sản phẩm liên quan", "Gợi ý sản phẩm dựa trên lịch sử xem và mua.", "be", "low", 20, []),
                _t("Ứng dụng di động ShopViet", "Ứng dụng mua sắm cho điện thoại.", "fe", "low", 40, []),
                _t("Tích hợp vận chuyển với đơn vị giao hàng", "Tính phí và tạo vận đơn tự động.", "be", "medium", 18, []),
            ],
        },
    ),
]


def _w(title, desc, kind, status, prio, est, who, st, dl, **opt):
    return dict(title=title, desc=desc, kind=kind, status=status, prio=prio, est=est, who=who, st=st, dl=dl, opt=opt)


WATERFALL_PROJECT = dict(
    name="Hệ thống quản lý kho thông minh",
    desc="Hệ thống quản lý nhập xuất tồn kho cho chuỗi bán lẻ, có máy quét mã vạch, kiểm kê và cảnh báo tồn thấp. Triển khai theo mô hình thác nước.",
    status="active", pm="ethan", start="2026-08-03", end="2027-02-26",
    members=["ethan", "noah", "sophia", "natali", "riley", "owen", "amelie", "cameron", "ashwin"],
    phases=[
        dict(title="Khảo sát và phân tích yêu cầu", desc="Tìm hiểu quy trình kho hiện tại và chốt tài liệu yêu cầu với khách hàng.",
             kids=[
                 _w("Khảo sát quy trình nhập xuất kho hiện tại", "Quan sát và ghi lại quy trình tại hai kho mẫu.", "ba", "done", "high", 12, ["natali"], "2026-08-03", "2026-08-07"),
                 _w("Phỏng vấn thủ kho và kế toán kho", "Thu thập khó khăn và mong muốn của người dùng cuối.", "ba", "done", "medium", 10, ["natali", "ashwin"], "2026-08-10", "2026-08-14"),
                 _w("Lập danh sách yêu cầu chức năng", "Tổng hợp và xếp ưu tiên các yêu cầu chức năng và phi chức năng.", "ba", "done", "high", 14, ["natali", "noah"], "2026-08-13", "2026-08-21"),
                 _w("Phê duyệt tài liệu yêu cầu với khách hàng", "Trình bày và nhận chữ ký duyệt tài liệu yêu cầu.", "doc", "done", "high", 6, ["natali"], "2026-08-24", "2026-08-28",
                    att=("yeu-cau-he-thong-kho-v1-2.pdf", "natali"),
                    cm=[("natali", "Khách hàng đã ký duyệt tài liệu phiên bản 1.2, tệp đính kèm bên dưới."),
                        ("ethan", "Cảm ơn {@natali}. Từ giờ mọi thay đổi yêu cầu phải qua quy trình thay đổi phạm vi.")]),
             ]),
        dict(title="Thiết kế hệ thống", desc="Thiết kế kiến trúc, cơ sở dữ liệu, giao diện và kịch bản kiểm thử.",
             kids=[
                 _w("Thiết kế kiến trúc tổng thể", "Chọn kiến trúc, công nghệ và cách triển khai.", "be", "done", "high", 16, ["noah"], "2026-08-31", "2026-09-11",
                    att=("kien-truc-tong-the-kho.pdf", "noah")),
                 _w("Thiết kế cơ sở dữ liệu kho và tồn", "Mô hình hóa kho, vị trí, lô hàng và biến động tồn.", "be", "done", "high", 14, ["riley", "noah"], "2026-09-07", "2026-09-18"),
                 _w("Thiết kế giao diện web quản lý", "Giao diện cho thủ kho và kế toán trên máy tính.", "fe", "done", "medium", 16, ["amelie"], "2026-09-07", "2026-09-25"),
                 _w("Thiết kế giao diện máy quét mã vạch", "Giao diện tối giản cho thiết bị cầm tay.", "fe", "done", "medium", 12, ["amelie", "ashwin"], "2026-09-21", "2026-10-02"),
                 _w("Thiết kế kịch bản kiểm thử tổng thể", "Chiến lược, phạm vi và tiêu chí chấp nhận.", "qa", "done", "medium", 10, ["sophia"], "2026-09-21", "2026-10-02"),
             ]),
        dict(title="Lập trình và tích hợp", desc="Xây dựng các module chính, giao diện và tích hợp thiết bị, phần mềm kế toán.",
             kids=[
                 _w("Module nhập kho", "Phiếu nhập, kiểm tra theo đơn mua và cập nhật tồn.", "be", "done", "high", 20, ["riley"], "2026-10-05", "2026-10-23"),
                 _w("Module xuất kho", "Phiếu xuất, gợi ý lô xuất trước và trừ tồn.", "be", "done", "high", 20, ["owen"], "2026-10-05", "2026-10-23"),
                 _w("Giao diện quản lý nhập xuất", "Màn hình tạo và duyệt phiếu nhập xuất.", "fe", "done", "high", 24, ["amelie"], "2026-10-12", "2026-11-02"),
                 _w("Module kiểm kê tồn kho", "Kiểm kê theo lô, đối chiếu chênh lệch và điều chỉnh tồn.", "be", "in_progress", "high", 24, ["riley", "owen"], "2026-10-26", "2026-11-20",
                    cm=[("ethan", "{@riley} khách hàng hỏi về tiến độ kiểm kê theo lô, bạn cho mình ngày chốt dự kiến nhé."),
                        ("riley", "Dự kiến 20/11 xong phần kiểm kê theo lô, phần theo vị trí kệ sẽ làm sau."),
                        ("noah", "Phần vị trí kệ thuộc giai đoạn sau, {@ethan} ghi nhận vào danh sách thay đổi giúp mình.")]),
                 _w("Giao diện kiểm kê và cảnh báo tồn thấp", "Màn hình kiểm kê và danh sách hàng sắp hết.", "fe", "in_progress", "medium", 20, ["amelie", "ashwin"], "2026-11-02", "2026-11-27"),
                 _w("Tích hợp máy quét mã vạch", "Nhận mã từ máy quét cầm tay và đồng bộ vào phiếu.", "be", "in_progress", "high", 16, ["owen"], "2026-11-02", "2026-11-20",
                    cm=[("owen", "Máy quét dòng mới trả về mã có ký tự xuống dòng, mình đã thêm bước làm sạch dữ liệu đầu vào."),
                        ("sophia", "{@owen} cảm ơn bạn, mình sẽ bổ sung ca kiểm thử cho trường hợp này.")]),
                 _w("Kiểm thử đơn vị các module", "Viết và chạy kiểm thử đơn vị cho module nhập, xuất, kiểm kê.", "qa", "in_progress", "high", 16, ["sophia", "cameron"], "2026-10-26", "2026-11-04",
                    rej=True,
                    cm=[("sophia", "{@riley} còn 4 lỗi mức cao ở module nhập kho, nhờ bạn xử lý trước thứ Hai."),
                        ("riley", "Mình nhận, sẽ gửi bản sửa trong ngày mai.")]),
                 _w("Báo cáo tồn kho và dự báo nhập hàng", "Báo cáo tồn theo kho, vòng quay hàng và dự báo nhập.", "be", "todo", "medium", 24, ["riley"], "2026-11-23", "2026-12-11"),
                 _w("Tích hợp với phần mềm kế toán", "Đẩy chứng từ nhập xuất sang phần mềm kế toán của khách.", "be", "todo", "high", 20, ["noah", "owen"], "2026-11-30", "2026-12-18"),
             ]),
        dict(title="Kiểm thử và nghiệm thu", desc="Kiểm thử toàn hệ thống, sửa lỗi và nghiệm thu với khách hàng.",
             kids=[
                 _w("Kiểm thử tích hợp toàn hệ thống", "Chạy kịch bản từ đầu đến cuối trên môi trường gần thật.", "qa", "todo", "high", 24, ["sophia", "cameron"], "2026-12-21", "2027-01-08"),
                 _w("Kiểm thử hiệu năng và bảo mật", "Thử tải, kiểm tra phân quyền và lỗ hổng phổ biến.", "qa", "todo", "high", 20, ["sophia"], "2027-01-11", "2027-01-22"),
                 _w("Sửa lỗi sau kiểm thử", "Xử lý các lỗi phát hiện ở hai đợt kiểm thử.", "be", "todo", "high", 24, ["riley", "owen"], "2027-01-11", "2027-01-29"),
                 _w("Nghiệm thu với khách hàng", "Trình diễn và ký biên bản nghiệm thu.", "doc", "todo", "high", 8, ["natali"], "2027-02-01", "2027-02-05"),
             ]),
        dict(title="Triển khai và bàn giao", desc="Cài đặt tại kho thật, đào tạo và bàn giao.",
             kids=[
                 _w("Cài đặt hệ thống tại kho thật", "Cài đặt máy chủ, máy quét và nhập dữ liệu ban đầu.", "be", "todo", "high", 16, ["noah", "riley"], "2027-02-08", "2027-02-12"),
                 _w("Đào tạo nhân viên kho", "Hướng dẫn thủ kho và kế toán sử dụng hệ thống.", "doc", "todo", "medium", 12, ["natali", "ashwin"], "2027-02-15", "2027-02-19"),
                 _w("Hỗ trợ vận hành sau triển khai", "Trực hỗ trợ và xử lý sự cố trong tuần đầu.", "be", "todo", "high", 20, ["noah", "owen"], "2027-02-15", "2027-02-26"),
                 _w("Bàn giao tài liệu và đóng dự án", "Bàn giao mã nguồn, tài liệu và tổng kết dự án.", "doc", "todo", "medium", 6, ["natali"], "2027-02-22", "2027-02-26"),
             ]),
    ],
)
