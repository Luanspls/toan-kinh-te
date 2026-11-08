# Đề xuất: phần mềm mô phỏng hình học giúp học sinh THPT nghiên cứu sâu bài toán

> **Tóm tắt.** Học sinh không thiếu phần mềm vẽ hình. Cái các em thiếu là một môi trường **buộc các em suy nghĩ như nhà toán học**: quan sát cái bất biến, dám dự đoán, tự bác bỏ dự đoán bằng phản ví dụ, rồi đi tìm lý do *vì sao* điều đó đúng.
>
> Khuyến nghị gồm ba lớp:
> 1. **Dùng ngay:** **GeoGebra** (miễn phí, có tiếng Việt, chạy ngoại tuyến) làm công cụ chính, và **Euclidea** để rèn phép dựng hình.
> 2. **Bổ sung một lớp sư phạm** mà các phần mềm hiện có để trống. Bản mẫu **Xưởng Hình học** trong thư mục này đã làm được lớp đó: chu trình *Quan sát → Dự đoán → Kiểm nghiệm → Giải thích → Mở rộng*, bộ **kiểm nghiệm ngẫu nhiên có tìm phản ví dụ**, **thử thách dựng hình chấm bằng phép thử kéo thả**, thang gợi ý chứng minh.
> 3. **Lộ trình phát triển tiếp:** thêm chứng minh tự động, hình học không gian và ngân hàng bài bám theo SGK 10–12.

Bản mẫu chạy được ngay: mở [`index.html`](index.html) bằng Chrome hoặc Edge. Không cần cài đặt, không cần Internet.

---

## 1. Vấn đề: vì sao học sinh “học hình” mà chưa “nghĩ hình”

| Biểu hiện thường gặp | Nguyên nhân sâu xa |
|---|---|
| Vẽ đúng một hình rồi suy luận từ hình đó, vô tình dùng tính chất riêng của hình (tam giác “trông như” cân, điểm “trông như” trung điểm). | Hình vẽ trên giấy là **tĩnh**: học sinh chỉ thấy *một* trường hợp nên không phân biệt được điều *luôn đúng* với điều *tình cờ đúng*. |
| Coi chứng minh là thủ tục để “được điểm”, không phải để hiểu. | Kết luận đã được đề bài cho sẵn. Học sinh không trải qua khâu **tự phát hiện** nên không thấy cần phải giải thích. |
| Rất sợ bài quỹ tích, cực trị, bài có điểm di động. | Không có cách nào **nhìn thấy chuyển động** và cái bất biến bên trong nó. |
| Lời giải chỉ đúng với hình vẽ của mình (thiếu xét trường hợp). | Chưa từng thấy hình “đổi dạng” khi các điểm di chuyển. |
| Chép lời giải mà không biết người ta *nghĩ ra* bằng cách nào. | Không được rèn **chiến lược giải toán** (đặc biệt hóa, biến hình, đưa về bài quen). |

## 2. Cơ sở sư phạm

1. **Thang Van Hiele** (Van Hiele, 1986). Học sinh tiến lên qua các mức: *nhận dạng trực quan → phân tích tính chất → suy luận không hình thức → suy diễn → chặt chẽ*. Phần mềm động giúp chuyển từ mức 1 sang mức 2–3, vì khi kéo thả thì “hình dáng” thay đổi còn “tính chất” vẫn giữ nguyên.
2. **Bốn bước của Pólya** (*How to Solve It*, 1945): hiểu bài toán, lập kế hoạch, thực hiện, nhìn lại. Bước “nhìn lại – mở rộng” hay bị bỏ qua nhất, và cũng là bước tạo ra tư duy đỉnh cao.
3. **Vai trò của chứng minh** (de Villiers, 1990). Chứng minh không chỉ để *xác nhận* mà còn để *giải thích*, *phát hiện*, *hệ thống hóa* và *trao đổi*. Phần mềm động làm học sinh tin rất nhanh, nên trọng tâm chuyển sang chứng minh như một **lời giải thích**. Đây là cơ hội lớn, nhưng cũng là rủi ro: học sinh có thể nghĩ “máy kiểm tra rồi, không cần chứng minh”.
4. **Các kiểu kéo thả** (Arzarello và cộng sự, 2002): kéo lang thang, kéo có định hướng, kéo theo quỹ tích ẩn, kéo kiểm tra. Mỗi kiểu ứng với một giai đoạn tư duy, từ khám phá đến kiểm chứng.
5. **Hình dựng “bền” và “mềm”** (Healy, 2000). Hình dựng *bền* giữ đúng tính chất khi kéo thả. Hình dựng *mềm* chỉ đúng ở vị trí đặt bằng mắt. Phép thử kéo thả (*drag test*) là tiêu chuẩn tự nhiên để phân biệt hai loại.
6. **Chứng minh và bác bỏ** (Lakatos, 1976). Tri thức toán học phát triển qua chu trình *giả thuyết → phản ví dụ → sửa giả thuyết*. Học sinh cần được *trải nghiệm* việc một giả thuyết bị bác bỏ.
7. **Căn cứ chương trình.** Chương trình GDPT 2018 môn Toán đề cao năng lực *tư duy và lập luận*, *mô hình hóa*, *giải quyết vấn đề* và *sử dụng công cụ, phương tiện học toán*. Nhiều bộ SGK mới đã có hoạt động thực hành với phần mềm hình học động.

## 3. Khảo sát các phần mềm hiện có

| Phần mềm | Điểm mạnh | Hạn chế đối với mục tiêu “rèn tư duy” | Chi phí |
|---|---|---|---|
| **GeoGebra** (Classic 5/6, Geometry, 3D) | Đầy đủ nhất: hình phẳng, không gian, đồ thị, CAS, bảng tính. Có tiếng Việt, chạy trên web, máy tính và điện thoại, có bản ngoại tuyến. Kho tài liệu cộng đồng rất lớn. Có công cụ *Quan hệ* và các lệnh `Prove`/`ProveDetails` để chứng minh tự động. | Là công cụ “trung tính”: không dẫn dắt chu trình tư duy, giáo viên phải tự thiết kế hoạt động. Học sinh dễ dùng như “máy vẽ đẹp”. Chứng minh tự động chỉ trả lời đúng/sai, không giải thích. | Miễn phí (phi thương mại) |
| **Cabri II Plus / Cabri 3D** | Người tiên phong của hình học động (Grenoble). Thao tác kéo thả mượt, có nhiều nghiên cứu sư phạm đi kèm. | Có bản quyền, ít cập nhật, cộng đồng ở Việt Nam nhỏ. | Trả phí |
| **The Geometer’s Sketchpad** | Từng là chuẩn mực ở Mỹ, có nhiều giáo án “khám phá”. Nay phát triển tiếp dưới dạng Web Sketchpad. | Bản cài đặt cũ, ít được hỗ trợ. | Tùy phiên bản |
| **Cinderella / CindyJS** | Nền toán học rất chặt (hình học xạ ảnh, xử lý liên tục qua số phức nên không “nhảy nhánh”). CindyJS là mã nguồn mở. | Khó dùng với học sinh phổ thông, chủ yếu dành cho người làm học liệu. | Cinderella: trả phí, CindyJS: miễn phí |
| **Desmos Geometry** | Giao diện đơn giản, chạy trên web, dễ dùng trong lớp. | Ít công cụ, không có kiểm nghiệm hay chứng minh. | Miễn phí |
| **Euclidea** | Trò chơi dựng hình bằng thước và compa, có cấp độ, tối ưu số bước. Rèn tư duy dựng hình rất tốt. | Chỉ có dựng hình, không có khám phá định lý, quỹ tích hay cực trị. Một số phần phải trả phí. | Miễn phí kèm phần trả phí |
| **Java Geometry Expert (JGEX), GCLC** | Chứng minh tự động bằng phương pháp Wu, cơ sở Gröbner và *phương pháp diện tích* (Chou – Gao – Zhang). JGEX còn sinh được chứng minh đọc được. | Công cụ nghiên cứu, giao diện khó, không thiết kế cho học sinh. | Miễn phí |

**Kết luận khảo sát.** Về *công cụ*, GeoGebra gần như đủ. Khoảng trống nằm ở **lớp sư phạm**:

- Chưa có phần mềm nào **bắt học sinh dự đoán trước** khi được xem kết quả.
- Việc kiểm chứng giả thuyết chủ yếu dựa vào **mắt nhìn** khi kéo thả. Ngay cả công cụ *Quan hệ* của GeoGebra cũng chỉ trả lời cho từng cặp đối tượng, không chủ động **đi tìm phản ví dụ** rồi **đưa học sinh tới tận hình phản ví dụ**.
- Không phân biệt được **hình dựng bền và hình dựng “bằng mắt”** khi chấm bài dựng hình (trừ Euclidea).
- Không có **thang gợi ý chứng minh** gắn với hình, và không có bước **“mở rộng – đặt câu hỏi mới”**.

## 4. Đề xuất: Xưởng Hình học

### 4.1. Nguyên tắc thiết kế

1. **Dự đoán trước, kiểm nghiệm sau.** Nút kiểm nghiệm bị khóa cho tới khi học sinh chọn một dự đoán. Dự đoán sai rồi tự sửa giúp nhớ lâu hơn là được báo đáp án.
2. **Một phản ví dụ bác bỏ, nghìn ví dụ chưa chứng minh.** Công cụ phải dạy được đúng thái độ khoa học này.
3. **Máy kiểm nghiệm, người giải thích.** Khi giả thuyết đứng vững, phần mềm không dừng ở dòng “Đúng”. Nó hỏi lại: *“Vì sao?”*, rồi đưa ra thang gợi ý từng bậc.
4. **Hình dựng phải bền.** Lời giải dựng hình được chấm bằng phép thử kéo thả, nên dựng “bằng mắt” sẽ không được chấp nhận.
5. **Đơn giản, chạy mọi nơi.** Một trang web tĩnh, không cần cài đặt, không cần tài khoản, chạy ngoại tuyến trên máy tính và điện thoại. Chia sẻ hình bằng một đường liên kết.

### 4.2. Các khối chức năng và năng lực tư duy tương ứng

| Khối chức năng (đã có trong bản mẫu) | Năng lực tư duy được rèn |
|---|---|
| **Dựng hình động:** 22 công cụ (điểm, đoạn, đường thẳng, đường tròn, giao điểm, trung điểm, vuông góc, song song, hình chiếu, đối xứng, trung trực, phân giác, tâm, đo độ dài, đo góc…), kéo thả, điểm thuộc đường, phóng to, chụm hai ngón. | Nhận ra **bất biến** giữa vô số hình (Van Hiele mức 2) |
| **Danh sách bước dựng** theo thứ tự phụ thuộc (ví dụ “H: giao điểm của d₁ và d₂”). | Hiểu **cấu trúc logic** của hình: cái gì quyết định cái gì |
| **Kiểm nghiệm giả thuyết:** 8 loại quan hệ (thẳng hàng, đồng viên, đồng quy, song song, vuông góc, thuộc đường, bằng nhau, tỉ số không đổi). Có trạng thái ✓/✗ cập nhật trực tiếp, thử ngẫu nhiên 300 hình, nút **“Xem phản ví dụ”** và **“Xem một hình đúng”**. | Tư duy **phản biện**, phân biệt *trùng hợp* với *định lý*, tìm **điều kiện** để mệnh đề đúng |
| **Quỹ tích** (vẽ cả quỹ tích của một điểm theo điểm điều khiển), **vết**, **điểm tự chạy** ▶. | Tư duy **hàm**, **chuyển động**, phép biến hình |
| **Cực trị thực nghiệm:** ghi lại kỷ lục khi kéo, so với giá trị tối ưu thật do máy tính, đặt điểm vào vị trí tối ưu. | **Ước lượng**, thấy khoảng cách giữa “tìm thấy” và “giải thích được” |
| **Thử thách dựng hình** bằng thước và compa: công cụ bị giới hạn, chấm bằng phép thử kéo thả, đếm số thao tác so với mục tiêu. | Tư duy **thuật toán**, phân biệt **bền / mềm**, tối ưu lời giải |
| **Thang gợi ý** (mở dần từng bậc, có thể hiện thêm đường phụ lên hình), **chứng minh ẩn**, mục **“Mở rộng”**. | Chiến lược **Pólya**, kỹ năng **đặt câu hỏi mới**, khái quát hóa |
| **Lưu tệp, mở tệp, liên kết chia sẻ** (hình được mã hóa ngay trong đường liên kết). | Trao đổi và tranh luận toán học, giáo viên giao bài |

### 4.3. Cách kiểm nghiệm hoạt động, và vì sao nó không phải là chứng minh

Mỗi hình được biểu diễn bằng một **đồ thị phụ thuộc**. Các *tham số tự do* gồm tọa độ điểm tự do và vị trí của điểm trên đường; mọi đối tượng khác được tính lại từ chúng. Để kiểm nghiệm một quan hệ, phần mềm làm như sau:

1. Lấy 300 bộ tham số ngẫu nhiên. Một nửa là nhiễu nhỏ quanh hình của học sinh, để phản ví dụ trông quen thuộc. Nửa còn lại rải đều trên toàn vùng, để gặp được các “dạng hình” khác nhau: tam giác tù, tứ giác lõm…
2. Tính **sai lệch tương đối đã chuẩn hóa** của quan hệ. Ví dụ, với ba điểm thẳng hàng: diện tích tam giác chia cho bình phương cạnh lớn nhất. Quan hệ được coi là đúng khi sai lệch nhỏ hơn $10^{-6}$.
3. **Bỏ qua các hình suy biến** (điểm trùng nhau, giao điểm không tồn tại, hình “nổ” ra vô cùng) và báo riêng số lượng, không tính chúng là phản ví dụ.
4. Lưu lại phản ví dụ để học sinh **nhảy tới** và tự nhìn thấy.

Về mặt toán học, nhiều định lý hình học phẳng là **đẳng thức đa thức** giữa các tọa độ. Theo bổ đề **Schwartz–Zippel**, nếu một đa thức khác không thì khả năng nó bằng 0 tại một điểm ngẫu nhiên là cực nhỏ. Vì thế đúng tại nhiều điểm ngẫu nhiên là bằng chứng *xác suất* rất mạnh. Dù vậy, phần mềm cố ý gọi đây là **“kiểm nghiệm”**, không phải “chứng minh”, vì ba lẽ:

- máy tính tính bằng số thực dấu phẩy động, không chính xác tuyệt đối;
- nhiều mệnh đề chỉ đúng với một số dạng hình (điều kiện thứ tự, bất đẳng thức);
- quan trọng nhất, học sinh cần hiểu **vì sao** mệnh đề đúng.

Mỗi kết quả “Đứng vững” vì thế luôn kèm câu hỏi *“Vì sao nó đúng?”*.

Kiểm thử của bản mẫu: hơn 60 000 hình ngẫu nhiên cho năm định lý (Euler, chín điểm, Simson, Varignon, quỹ tích vị tự) **không sinh ra phản ví dụ giả nào**. Còn “định lý giả” ở Bài 4 bị bác bỏ ở 100% số hình hợp lệ.

### 4.4. Ngân hàng bài mẫu (10 bài)

| # | Bài | Ý tưởng tư duy chủ đạo |
|---|---|---|
| 1 | Đường thẳng Euler | Phép vị tự tâm $G$ tỉ số $-\tfrac12$ biến cả cấu hình |
| 2 | Đường tròn chín điểm | Đưa về điều yếu hơn (đường tròn đường kính $IM$), rồi dùng tính đối xứng |
| 3 | Đường thẳng Simson | Tứ giác nội tiếp, góc định hướng, số “dạng hình” cần xét |
| 4 | **Bẫy trực giác** | Hình trông thẳng hàng nhưng lệch 1,5%; phản ví dụ; điều kiện cần và đủ |
| 5 | Hình bình hành Varignon | Đường trung bình và lời giải véctơ đúng cả với tứ giác lõm |
| 6 | Quỹ tích trung điểm | Biến “quỹ tích” thành “ảnh qua phép vị tự” |
| 7 | Bài toán Heron | Thực nghiệm tìm *ở đâu*, phép đối xứng giải thích *vì sao* |
| 8–10 | Dựng tam giác đều, trung điểm, đường vuông góc (thước và compa) | Tư duy thuật toán, hình dựng bền, tối ưu số bước |

Giáo viên thêm bài bằng cách viết một khối khai báo trong [`bai-toan.js`](bai-toan.js), không cần sửa phần lõi. Ví dụ:

```js
{
  id: 'ten-bai', kind: 'explore', title: 'Tên bài', tag: 'Chủ đề · Lớp',
  intro: 'Mô tả, dùng $công thức$ KaTeX.',
  build(K) {
    const A = K.pt('A', -100, 0), B = K.pt('B', 100, 0), C = K.pt('C', 0, -150);
    const G = K.inter('G', K.seg(A, K.mid('M', B, C)), K.seg(B, K.mid('N', C, A)), 0);
    return { A, B, C, G };
  },
  predict: { q: 'Câu hỏi dự đoán?', opts: ['Phương án 1', 'Phương án 2'], ans: 0 },
  verify: { text: 'Giả thuyết…', checks: [['collinear', ['A', 'G', 'C']]] },
  hints: [{ t: 'Gợi ý 1' }, { t: 'Gợi ý 2', show: ['tên đối tượng ẩn'] }],
  proof: 'Chứng minh…', extend: ['Câu hỏi mở rộng…']
}
```

## 5. Gợi ý tổ chức dạy học

**Một tiết khám phá (45 phút):**

| Thời gian | Hoạt động | Vai trò của phần mềm |
|---|---|---|
| 5′ | Giáo viên nêu bối cảnh, học sinh kéo thả tự do | Quan sát |
| 5′ | Mỗi học sinh ghi dự đoán **lên giấy**, rồi chọn trên máy | Dự đoán (bị khóa kiểm nghiệm cho tới khi chọn) |
| 5′ | Kiểm nghiệm; nhóm nào có giả thuyết sai thì xem phản ví dụ | Kiểm nghiệm, phản ví dụ |
| 20′ | Nhóm 3–4 em tìm chứng minh, mở gợi ý *từng bậc một* khi bế tắc | Thang gợi ý |
| 10′ | Trình bày, so sánh các chứng minh, đặt câu hỏi “Mở rộng” | Liên kết chia sẻ hình |

**Câu lạc bộ học sinh giỏi:** mỗi tuần một “định lý giả” do học sinh tự tạo rồi đố nhau, gửi bằng liên kết. Thi giải thử thách dựng hình với ít thao tác nhất.

**Bài tập về nhà:** giao bằng liên kết `index.html#bai=<mã bài>` hoặc một liên kết chứa sẵn hình. Học sinh nộp chứng minh viết tay và tệp `.json` chứa hình của mình.

## 6. Lộ trình phát triển

| Giai đoạn | Nội dung | Gợi ý kỹ thuật |
|---|---|---|
| **GĐ 1 (đã xong, bản mẫu)** | Lõi hình học động, kiểm nghiệm ngẫu nhiên, quỹ tích, thử thách dựng hình, 10 bài mẫu | HTML/JS thuần, SVG, KaTeX; không phụ thuộc thư viện ngoài |
| **GĐ 2** | Phép biến hình (quay, vị tự, tịnh tiến), đa giác, đường conic; chế độ tọa độ và véctơ cho lớp 10 | Mở rộng bảng `KIND` và `evalOne` |
| **GĐ 3** | **Chứng minh tự động có giải thích**: phương pháp diện tích (sinh chứng minh đọc được) và cơ sở Gröbner (xác nhận chặt) | Tham khảo thuật toán của JGEX/GCLC, hoặc nối với GeoGebra Discovery |
| **GĐ 4** | Hình học không gian lớp 11–12 (quan hệ song song, vuông góc, khoảng cách, góc, thiết diện) | WebGL / Three.js |
| **GĐ 5** | Ngân hàng 100+ bài theo SGK 10–12 và đề HSG; bảng theo dõi của giáo viên (dự đoán ban đầu, số gợi ý đã dùng, thời gian) | Dùng lại cơ chế tài khoản và đồng bộ sẵn có của hệ thống bài giảng |

## 7. Đánh giá hiệu quả

- **Trước và sau:** bài kiểm tra mức Van Hiele (Usiskin, 1982) và một bài chứng minh mở, chấm theo rubric: nêu giả thuyết, kiểm tra trường hợp, lập luận, khái quát.
- **Dữ liệu quá trình:** tỉ lệ dự đoán đúng ở lần đầu, số gợi ý cần dùng, tỉ lệ lời giải dựng hình “bền” ngay lần đầu.
- **Định tính:** phỏng vấn học sinh về thái độ với chứng minh (“Vì sao cần chứng minh khi máy đã kiểm tra?”). Câu trả lời *“để hiểu vì sao”* là dấu hiệu thành công.

## 8. Rủi ro và cách hạn chế

| Rủi ro | Cách hạn chế trong thiết kế |
|---|---|
| Học sinh thay chứng minh bằng “máy bảo đúng” | Mọi kết quả đúng đều kèm câu hỏi “Vì sao?”; Bài 4 dạy rõ giới hạn của kiểm nghiệm; chứng minh mẫu chỉ mở sau khi đã xem gợi ý |
| Mở gợi ý quá sớm | Gợi ý mở **từng bậc**, giáo viên có thể yêu cầu ghi lại số gợi ý đã dùng |
| Kéo thả lang thang không mục đích | Mỗi bài có mục “Quan sát” với nhiệm vụ cụ thể |
| Thiết bị yếu, không có mạng | Trang web tĩnh, nhẹ (khoảng 110 KB mã nguồn), chạy ngoại tuyến, hỗ trợ cảm ứng |
| Hình suy biến làm kết quả sai | Bỏ qua hình suy biến và báo riêng; sai lệch được chuẩn hóa theo kích thước hình |

## 9. Tài liệu tham khảo

1. Van Hiele, P. M. (1986). *Structure and Insight: A Theory of Mathematics Education*. Academic Press.
2. Pólya, G. (1945). *How to Solve It*. Princeton University Press.
3. de Villiers, M. (1990). The role and function of proof in mathematics. *Pythagoras*, 24, 17–24.
4. Arzarello, F., Olivero, F., Paola, D., & Robutti, O. (2002). A cognitive analysis of dragging practises in Cabri environments. *ZDM*, 34(3), 66–72.
5. Healy, L. (2000). Identifying and explaining geometrical relationship: Interactions with robust and soft Cabri constructions. *Proceedings of PME 24*.
6. Lakatos, I. (1976). *Proofs and Refutations*. Cambridge University Press.
7. Chou, S.-C., Gao, X.-S., & Zhang, J.-Z. (1994). *Machine Proofs in Geometry*. World Scientific.
8. Kovács, Z., Recio, T., & Vélez, M. P. (2018). Using automated reasoning tools in GeoGebra in the teaching and learning of proving in geometry. *International Journal of Technology in Mathematics Education*, 25(2).
9. Schwartz, J. T. (1980). Fast probabilistic algorithms for verification of polynomial identities. *Journal of the ACM*, 27(4), 701–717.
10. Usiskin, Z. (1982). *Van Hiele Levels and Achievement in Secondary School Geometry*. University of Chicago.
11. Bộ Giáo dục và Đào tạo (2018). *Chương trình giáo dục phổ thông môn Toán* (ban hành kèm Thông tư 32/2018/TT-BGDĐT).
