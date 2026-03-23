# HERB_LOOT

## Summary
Danh sách vật liệu thảo dược từ `data/items/herbs.json` (dùng cho cơ chế rơi từ `pick`).

## What data this doc covers
- Toàn bộ item trong `herbs.json` và các trường dữ liệu mô tả item.

## Data source (JSON files)
- `data/items/herbs.json`

## Item fields (common schema)
- `id` / key: khóa item (vd: `ngu_nien_sam`)
- `name`: tên vật phẩm
- `emoji`: emoji hiển thị
- `rarity`: cấp độ hiếm (`common`, `uncommon`, `rare`, ...)
- `value`: giá trị số (được trả về khi drop/hiển thị item)
- `description`: mô tả lore

## Item list
- 🥕 Ngũ niên sâm (ngu_nien_sam) - rarity: common - value: 1 - Loại sâm nhỏ, linh khí yếu, dùng để hồi phục sinh mệnh cho tu sĩ nhập môn
- 💓 Sinh mạch thảo (sinh_mach_thao) - rarity: common - value: 1 - Cỏ linh xanh mượt, hấp thu sương sớm, có tác dụng bồi bổ linh khí, giúp khôi phục linh lực cho người mới tu h...
- 🫐 Tiểu long lân quả (tieu_long_lan_qua) - rarity: common - value: 1 - Quả vảy rồng con, vảy mềm, long khí yếu ớt, thường mọc ở gần suối linh khí thấp.
- 🍂 Huyết diệp thảo (huyet_diep_thao) - rarity: common - value: 1 - Lá đỏ như máu, ẩn chứa tinh huyết linh thú, dùng làm nền cho đan dược tăng cường sức mạnh cơ thể.
- 🍊 Hổ lực quả (ho_luc_qua) - rarity: common - value: 1 - Quả tròn vàng, vị cay, tăng dương khí, giúp cơ thể sinh lực sung mãn như hổ.
- 🍃 Thanh diệp thảo (thanh_diep_thao) - rarity: common - value: 1 - Lá xanh nhạt, khí ôn hòa, giúp tâm thần thanh tĩnh, khai mở linh trí, thích hợp cho đan dược trợ ngộ đạo.
- 🎐 Phong linh thảo (phong_linh_thao) - rarity: common - value: 1 - Cỏ nhẹ như tơ, lay động theo gió, có thể trợ tăng tốc độ phản ứng và độ linh hoạt.
- 🪨 Thạch căn thảo (thach_can_thao) - rarity: common - value: 1 - Cỏ mọc giữa khe đá, rễ cứng và bền, dùng để bồi dưỡng khí huyết, tăng sức chịu đựng cho người tu luyện
- 🔥 Liệt hỏa hoa (liet_hoa_hoa) - rarity: common - value: 1 - Cánh hoa đỏ rực, chứa hỏa linh, giúp kích phát vận may và tinh thần chiến đấu.
- 🪞 Ảnh diệp thảo (anh_diep_thao) - rarity: common - value: 1 - Loại cỏ ẩn mình dưới bóng cây cổ, khó hái, hương thơm nhẹ, thường bán làm nguyên liệu pha trà.
- 🍃 Thanh vân diệp (thanh_van_diep) - rarity: common - value: 1 - Lá cây mỏng manh ánh lam, hấp thu sương sớm linh khí, không đủ tinh thuần để luyện đan nhưng được thương nhân...
- 🥕 Thập niên sâm (thap_nien_sam) - rarity: uncommon - value: 1 - Sâm mười năm tuổi, linh khí thuần tịnh, dùng để chế luyện đan hồi phục trung cấp, giúp tái tạo sinh cơ và ổn ...
- ☁️ Tử vân thảo (tu_van_thao) - rarity: uncommon - value: 1 - Cỏ tím óng ánh, hấp thu linh vụ mỗi đêm, tăng mạnh khả năng hồi phục linh lực, thường dùng trong các loại lin...
- 🫐 Thanh lân quả (thanh_lan_qua) - rarity: uncommon - value: 1 - Quả lam tỏa sáng, chứa tinh khí hiền hòa, giúp người tu hành ổn định dòng linh lực.
- 💎 Hồng tinh thảo (hong_tinh_thao) - rarity: uncommon - value: 1 - Cỏ có lá đỏ ánh kim, chứa tinh hoa hỏa linh, giúp tăng cường thể chất và sức mạnh cánh tay, hợp với tu sĩ luy...
- 💚 Thanh tâm thảo (thanh_tam_thao) - rarity: uncommon - value: 1 - Thảo dược thanh mộc, giúp an thần, ổn định tâm mạch khi đột phá.
- ✨ Huyền diệu quả (huyen_dieu_qua) - rarity: uncommon - value: 1 - Quả tròn phát sáng nhẹ, linh khí ổn định, không tương thích với đan đạo nên chỉ được dùng làm cống phẩm hoặc ...
- 🖤 U tán thảo (u_tan_thao) - rarity: uncommon - value: 1 - Cỏ đen hiếm mọc nơi khe núi âm hàn, hấp thu linh khí hắc ám, không thể luyện đan nhưng quý hiếm nên giá cao t...
- 🌿 Thanh lan thảo (thanh_lan_thao) - rarity: uncommon - value: 1 - Cỏ lam linh tính cao, dùng để ổn định linh lực khi dung hợp hoặc luyện hóa pháp bảo.
- 🌸 Tử hầu hoa (tu_hau_hoa) - rarity: uncommon - value: 1 - Hoa tím tỏa linh quang, trợ giúp ổn định kinh mạch khi đột phá Trúc Cơ cảnh, giảm nguy cơ tẩu hỏa nhập ma
- 🫐 Tử hầu quả (tu_hau_qua) - rarity: uncommon - value: 1 - Quả cùng họ với Tử hầu hoa, chứa linh dịch ngưng tụ, giúp ổn định tâm cảnh khi luyện khí.
- 🥕 Bách niên sâm (bach_nien_sam) - rarity: rare - value: 1 - Cây sâm trăm năm, thân vàng, tỏa hương thơm ngát, trợ giúp hồi phục và đột phá cảnh giới trung cấp.
- 💎 Ngọc diệp thảo (ngoc_diep_thao) - rarity: rare - value: 1 - Lá ngọc xanh mượt, trữ linh lực lớn, dùng trong nhiều loại đan cao cấp.
- 🐉 Long lân quả (long_lan_qua) - rarity: rare - value: 1 - Quả long lân tỏa nhiệt, giúp tăng cường dược tính và độ tinh khiết.
- 🖤 Huyền vũ diệp (huyen_vu_diep) - rarity: rare - value: 1 - Lá cây cổ, mang linh khí đất trời, giúp tăng hiệu quả luyện đan và bền dược tính.
- 🧿 Trấn hồn diệp (tran_hon_diep) - rarity: rare - value: 1 - Lá linh thảo mang linh khí trầm ổn, giúp trấn định tâm hồn, tránh mê hoặc
- 🔥 Hỏa tinh quả (hoa_tinh_qua) - rarity: rare - value: 1 - Quả đỏ rực chứa hỏa linh tinh hoa, giúp tăng sức mạnh và ý chí chiến đấu.
- 💜 Tử diệp thảo (tu_diep_thao) - rarity: rare - value: 1 - Lá tím chứa linh trí khí, giúp khai mở thần thức và trí tuệ.
- 🌀 Bích phong thảo (bich_phong_thao) - rarity: rare - value: 1 - Thảo mọc nơi gió xoáy, linh tính linh hoạt, giúp tăng tốc độ phản ứng.
- 🪴 Ngọc căn thảo (ngoc_can_thao) - rarity: rare - value: 1 - Rễ ngọc trắng mềm, giúp dưỡng mạch, tăng sức chịu đựng linh thể.
- 🌌 Tinh vân quả (tinh_van_qua) - rarity: rare - value: 1 - Quả chứa tinh vân linh quang, giúp tăng vận khí và cảm ứng cơ duyên.
- 🫐 Lam diệp thảo (lam_diep_thao) - rarity: rare - value: 1 - Cỏ lam ánh nhẹ, linh khí yếu, chỉ dùng để bán đổi linh thạch.
- 🖤 Ô huyền hoa (o_huyen_hoa) - rarity: rare - value: 1 - Hoa đen ánh tím, khó sử dụng trong luyện đan, thường được thu mua làm vật phẩm hiếm.
- 🌳 Địa căn linh mộc (dia_can_linh_moc) - rarity: rare - value: 1 - Rễ cổ hút linh khí trong lòng đất, giúp vật phẩm thêm linh tính và dẻo dai.
- 🌺 Thất hà liên (that_ha_lien) - rarity: rare - value: 1 - Sen bảy cánh tỏa linh khí, nguyên liệu quan trọng để điều chế linh đan đột phá.
- ☁️ Xích vân thảo (xich_van_thao) - rarity: rare - value: 1 - Lá đỏ tươi, tỏa sương hồng, giúp vận chuyển chân khí mượt mà.
- 🥕 Thiên niên sâm (thien_nien_sam) - rarity: epic - value: 1 - Sâm ngàn năm, hình dáng gần như nhân hình, linh khí tinh thuần, hỗ trợ đột phá cảnh giới cao.
- 💚 Bích quang thảo (bich_quang_thao) - rarity: epic - value: 1 - Lá tỏa ánh sáng nhạt, khi chạm vào tỏa ra linh khí tinh khiết, thanh lọc linh hồn.
- 🍎 Thiên linh quả (thien_linh_qua) - rarity: epic - value: 1 - Quả kết tinh tinh hoa trời đất, long khí tinh thuần, có thể tăng mạnh xác suất đột phá cảnh giới cao.
- 🍁 Chu thiên huyết diệp (chu_thien_huyet_diep) - rarity: epic - value: 1 - Lá đỏ sẫm, gân lá phát sáng như mạch máu, tăng bộc phát sức mạnh tức thời.
- 🌼 Minh thần hoa (minh_than_hoa) - rarity: epic - value: 1 - Hoa nở trong màn linh quang nhạt, khí tức thuần khiết giúp thanh lọc uế khí và trừ bỏ mọi ám chướng
- 🌸 Thiên vận hoa (thien_van_hoa) - rarity: epic - value: 1 - Loài hoa nở duy nhất vào khoảnh khắc sao băng rơi, cánh hoa ánh bạc như dải ngân hà, tỏa ra linh khí dẫn dắt ...
- ☁️ Ngân vân hoa (ngan_van_hoa) - rarity: epic - value: 1 - Hoa nở trong mây bạc, linh khí cao nhưng không ổn định, chỉ dùng làm vật phẩm sưu tầm.
- 🪨 Hắc diệp thạch lan (hac_diep_thach_lan) - rarity: epic - value: 1 - Cây lan sắc đen, hấp thu linh khí chậm, được trao đổi trong thương hội tu tiên.
- 🍃 Thiên huyền linh diệp (thien_huyen_linh_diep) - rarity: epic - value: 1 - Linh dược mọc trên đỉnh linh sơn, hút tinh quang nhật nguyệt, thường dùng để khai linh cho pháp bảo cao cấp.
- 🌺 Thiên tâm liên (thien_tam_lien) - rarity: epic - value: 1 - Đóa sen mọc giữa hồ linh khí ngàn năm, mỗi cánh hoa chứa một tầng đạo vận, giúp ổn định tâm thần và bồi dưỡng...
- 🌿 Ngọc huyền chi (ngoc_huyen_chi) - rarity: epic - value: 1 - Cành cây ngọc xanh óng ánh, mọc ở vách núi huyền không, liên tục hấp thu tinh hoa nhật nguyệt, giúp tăng khả ...
- 🥕 Vạn niên sâm (van_nien_sam) - rarity: legendary - value: 1 - Sâm vạn năm, đã hóa thành linh thể, mỗi củ chứa sức mạnh sánh ngang pháp bảo thượng cổ.
- 💛 Kim tâm thảo (kim_tam_thao) - rarity: legendary - value: 1 - Lá vàng kim, mỗi chiếc lá là một pháp bảo tự nhiên, có thể giải trừ hầu hết độc tố và tà niệm.
- 🐉 Long tủy quả (long_tuy_qua) - rarity: legendary - value: 1 - Chỉ xuất hiện khi rồng thần hoặc rồng tiên hóa thành, chứa khí tức áp đảo và linh lực cực thuần khiết.
- 🍄 Hỗn nguyên linh chi (hon_nguyen_linh_chi) - rarity: legendary - value: 1 - Linh chi hấp thu khí hỗn nguyên của trời đất, điều hòa năm hành trong cơ thể, tăng cường toàn diện căn cơ.
- 🪷 Vô niệm tâm hoa (vo_niem_tam_hoa) - rarity: legendary - value: 1 - Linh hoa hiếm thấy, một cánh nở ra là vạn niệm tịch diệt, ngoại tà không thể xâm nhập nửa phân
- 🩸 Thánh huyết linh thảo (thanh_huyet_linh_thao) - rarity: legendary - value: 1 - Cây huyền diệu, mỗi lá là kết tinh sinh mệnh lực, kích hoạt toàn bộ tiềm lực cơ thể.
- 🌌 Hỗn nguyên quả (hon_nguyen_qua) - rarity: legendary - value: 1 - Trái cây ánh bạc, bên trong như vũ trụ thu nhỏ, chứa sức mạnh hỗn nguyên sơ khai, phục hồi toàn diện và cải t...
- 🌺 Tiên huyết chi lan (tien_huyet_chi_lan) - rarity: legendary - value: 1 - Lan đỏ tươi như máu, mỗi giọt sương trên cánh chứa sinh mệnh lực hùng hậu, có thể kéo người từ bờ vực cái chế...

## How this data is used (code)
- `src/utils/data/item-loader.js`: `ItemLoader.loadAllItems()` sẽ load và merge `herbs.json` vào pool item chung, đồng thời gán `category="herbs"`.
- `src/utils/game/item-drop-calculator.js`: `ItemDropCalculator.calculatePickItems()` lọc item theo `category === 'herbs'`, chọn theo `rarity` và trả về `value`/`description` từ JSON.
- `src/commands/exploration/pick.js`: dùng `ItemDropCalculator.calculatePickItems(player)` để hiển thị danh sách thảo dược thu được.

## Notes / Edge cases
- `herbs.json` có trường `value`; khi drop/hiển thị trong các lệnh, `value` sẽ được trả về kèm theo item.
