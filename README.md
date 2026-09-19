# Mindset 1 Vocabulary

Website học từ vựng cho Mindset for IELTS Level 1, biên soạn cho lớp của Mr. Hà Chí Thanh.

**Học tại: https://thanh990522.github.io/mindset-1-vocabulary/**

Bộ thẻ được mở rộng từ 325 mục lên **2.070 thẻ**, gồm 8 Unit và 32 phần kỹ năng. Reading lấy ngôn ngữ trong bài đọc; Listening lấy từ transcript. Speaking/Writing có thêm collocation và cấu trúc ứng dụng, được ghi nhãn “Bổ sung luyện tập”.

| Unit | Reading | Listening | Speaking | Writing | Tổng thẻ |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 70 | 66 | 53 | 56 | **245** |
| 2 | 76 | 73 | 56 | 48 | **253** |
| 3 | 92 | 51 | 79 | 47 | **269** |
| 4 | 85 | 74 | 60 | 31 | **250** |
| 5 | 99 | 70 | 52 | 42 | **263** |
| 6 | 71 | 87 | 51 | 41 | **250** |
| 7 | 78 | 103 | 44 | 36 | **261** |
| 8 | 97 | 86 | 53 | 43 | **279** |

Một từ có thể xuất hiện ở nhiều kỹ năng vì ngữ cảnh khác nhau. Số mục tiếng Anh khác nhau trong toàn bộ bộ thẻ: **2.042**.

## Học với thẻ

- Tất cả từ, cụm từ, collocation và cấu trúc đều dùng thẻ lật Anh–Việt, có thể đổi mặt trước. Mỗi thẻ có nhãn loại từ theo ngữ cảnh: danh từ, động từ, tính từ, cụm từ hoặc cấu trúc câu.
- Lọc theo Unit, kỹ năng, nội dung, loại thẻ và trạng thái đã nhớ; tìm bằng tiếng Anh hoặc tiếng Việt có/không dấu.
- Trộn thẻ, phân trang và lưu tiến độ trên trình duyệt. Tiến độ bản cũ được chuyển cho những từ còn khớp trong cùng Unit.
- Xem nguồn trang/track trên từng thẻ. Các ví dụ là ví dụ luyện tập.
- Nút nghe dùng giọng tiếng Anh của thiết bị; không phải bản thu của sách. Phiên âm chỉ giữ ở những mục khớp dữ liệu cũ.
- Theme vàng–xanh dương, thẻ tự co chiều cao theo mặt đang xem, font Arial với font dự phòng hỗ trợ tiếng Việt, dùng được bằng bàn phím và trên điện thoại.

Xem [ghi chú đối chiếu nội dung](CONTENT_NOTES.md) để biết phạm vi nguồn và quy tắc biên soạn.

## Cập nhật nội dung

Nguồn chỉnh sửa nằm trong `content/unit1.txt` đến `content/unit8.txt`. Mỗi nhóm bắt đầu bằng:

```text
@reading|Tên nhóm|SB pp. 8–11; TB pp. 12–13
term|nghĩa tiếng Việt|loại thẻ tùy chọn|ví dụ tùy chọn|loại từ
extended family|gia đình nhiều thế hệ|||noun_phrase
```

Các loại thẻ: `word`, `phrase`, `collocation`, `structure`. Bắt đầu nguồn bằng `Bổ sung` cho nhóm ứng dụng Speaking/Writing. Trường thứ năm là loại từ bắt buộc, dùng mã trong `content/parts-of-speech.json`. Giữ trường trống bằng dấu `||` nếu bỏ qua loại thẻ hoặc ví dụ. Không dùng dấu `|` bên trong nội dung của một trường.

```bash
npm run build
npm test
```

Build dùng Python 3, kiểm tra dùng Node.js; không cần thư viện bên ngoài. Commit cả nguồn `content/` và dữ liệu được tạo trong `data/`. GitHub Actions kiểm tra dữ liệu trước khi triển khai GitHub Pages.

Website không đăng lại PDF, bài đọc đầy đủ, transcript đầy đủ hoặc audio gốc của sách.
