# 🤖 Telegram AI Assistant Bot (Google Gemini)

Bot Telegram thông minh, phản hồi chính xác, tự nhiên như một trợ lý AI thực thụ, được tích hợp công nghệ **Google Gemini AI** thế hệ mới cùng tính năng **Google Search Grounding (tìm kiếm thông tin web thời gian thực)** và **quản lý ngữ cảnh hội thoại đa lượt**.

---

## 🌟 Điểm nổi bật & Tính năng chính

1. **Trí tuệ nhân tạo chuẩn xác (Google Gemini):**
   - Sử dụng mô hình `gemini-3.8-flash` (hoặc cấu hình lên `gemini-4-argon`, `gemini-3.5-flash-lite`).
   - Nhiệt độ suy luận (temperature) được tinh chỉnh tối ưu cho độ chính xác cao, tính logic và hạn chế tối đa hiện tượng ảo giác (hallucination).

2. **Cơ chế Hội đồng AI Đồng thuận (`/swarm`):**
   - Kích hoạt mô hình Multi-Agent Swarm gồm 3 tác tử:
     - 🔬 **Tác tử Khảo cứu (Researcher):** Thu thập dữ liệu thực tế và tra cứu thông tin nền tảng.
     - ⚖️ **Tác tử Phản biện (Critic):** Soi chiếu giả định, stress-test logic, loại bỏ ảo giác.
     - 🎯 **Tác tử Đồng thuận (Synthesizer):** Đúc kết và đưa ra kết luận chuẩn xác và toàn diện nhất.

3. **Tra cứu Web thời gian thực (Google Search Grounding / `/browse`):**
   - Tự động tìm kiếm dữ liệu mới nhất trên internet khi gặp câu hỏi về tin tức, thời tiết, giá cả, sự kiện hiện tại.
   - Tự động trích dẫn đường dẫn nguồn tham khảo minh bạch ở cuối câu trả lời.

4. **Chế độ suy luận sâu (`/boost`):**
   - Kích hoạt phân tích đa chiều, suy luận logic từng bước (Chain-of-Thought step-by-step reasoning) cho các bài toán phức tạp, phân tích kiến trúc, khoa học hoặc lập trình.

5. **Ghi nhớ ngữ cảnh hội thoại đa lượt (Multi-turn Context):**
   - Lưu trữ lịch sử câu hỏi - câu trả lời theo từng người dùng / nhóm chat.
   - Cho phép hỏi tiếp nối tự nhiên mà không cần nhắc lại câu hỏi trước.
   - Tự động cắt tỉa theo cửa sổ trượt (sliding window) để không bị tràn bộ nhớ hoặc vượt giới hạn token.
   - Hỗ trợ lệnh `/clear` hoặc `/reset` để làm mới cuộc trò chuyện bất cứ lúc nào.

6. **Trải nghiệm người dùng mượt mà trên Telegram:**
   - **Tự động đăng ký menu lệnh:** Tự động gọi `setMyCommands` để menu lệnh `/swarm`, `/browse`, `/boost`,... hiển thị sẵn trên ứng dụng Telegram.
   - **Hỗ trợ Tag thông minh:** Hỗ trợ cả lệnh slash (ví dụ: `/swarm <câu hỏi>`) lẫn tag ở cuối tin nhắn (ví dụ: `<câu hỏi> /swarm`).
   - **Hiệu ứng gõ phím liên tục (Typing indicator):** Người dùng luôn thấy "Bot đang soạn tin nhắn..." trong khi AI đang suy nghĩ.
   - **Chia nhỏ tin nhắn thông minh (Message Chunker):** Tự động chia các câu trả lời dài (>4000 ký tự) theo ranh giới đoạn văn / câu, bảo toàn trọn vẹn cú pháp khối mã lệnh (Markdown code blocks ` ``` `) và thụt lề code (indentation) sang tin nhắn kế tiếp.
   - **Tự động phục hồi lỗi định dạng:** Nếu AI trả về ký tự markdown đặc biệt làm Telegram báo lỗi 400, bot tự động fallback gửi dạng văn bản thường mà không làm mất tin nhắn của người dùng.

---

## 📋 Danh sách các lệnh điều khiển

| Lệnh | Ý nghĩa & Cách dùng |
|---|---|
| `/start` | Khởi động bot, hiển thị lời chào và hướng dẫn tổng quan. |
| `/help` | Xem bảng hướng dẫn sử dụng chi tiết và các mẹo hỏi đáp. |
| `/swarm <câu hỏi>` | 🐝 Kích hoạt Hội đồng AI đa tác tử đồng thuận (Khảo cứu, Phản biện, Đồng thuận) nhằm đảm bảo câu trả lời chuẩn xác nhất. |
| `/browse <nội dung>` | 🔍 Bắt buộc bot tra cứu Google Search trực tiếp để lấy thông tin mới nhất và trích dẫn nguồn. |
| `/boost <câu hỏi>` | ⚡ Yêu cầu bot suy luận sâu từng bước (Chain-of-Thought), đối chiếu logic chặt chẽ. |
| `/clear` hoặc `/reset` | 🧹 Xóa lịch sử trò chuyện hiện tại, bắt đầu phiên mới. |
| `/status` | 📊 Kiểm tra thời gian bot hoạt động, mô hình AI đang dùng và số lượt hội thoại lưu trong phiên. |

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Chuẩn bị môi trường
- Máy tính đã cài đặt **Node.js >= 18** (Đã hỗ trợ tốt nhất trên Node 20 / Node 24).

### 2. Lấy API Token cần thiết

1. **Telegram Bot Token:**
   - Mở ứng dụng Telegram, tìm bot [@BotFather](https://t.me/BotFather).
   - Nhấn `/start` rồi gõ lệnh `/newbot`.
   - Làm theo hướng dẫn đặt tên cho bot.
   - BotFather sẽ cấp cho bạn một chuỗi token có dạng: `123456789:ABCdefGhI_klmNOPqrSTUvwxyz...`

2. **Google Gemini API Key:**
   - Truy cập: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Đăng nhập tài khoản Google và nhấn nút **Create API key** (hoàn toàn miễn phí).
   - Copy mã API key dạng `AIzaSy...`.

### 3. Cấu hình file `.env`

Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```

Mở file `.env` và điền 2 thông tin đã lấy ở trên:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhI_klmNOPqrSTUvwxyz...
GEMINI_API_KEY=AIzaSy...
```

### 4. Khởi chạy Bot

Chạy trực tiếp bằng `npm`:
```bash
npm start
```

Hoặc chạy ở chế độ phát triển (tự động reload khi sửa code):
```bash
npm run dev
```

Trên Windows, bạn cũng có thể nhấp đúp chuột vào file `start.bat` để chạy ngay lập tức.

---

## 🧪 Chạy bộ kiểm thử tự động (Unit & Integration Tests)

Dự án đi kèm bộ 41 kiểm thử tự động toàn diện kiểm tra tất cả các trường hợp biên, cắt nối tin nhắn, bộ nhớ ngữ cảnh và xử lý lỗi:

```bash
npm test
```

Kết quả:
```text
✔ AI Services (MockAIService, GeminiAIService Validation & Error Mapping)
✔ Telegram Bot Updates & Commands (/start, /help, /browse, /boost, /status, /clear)
✔ Edge Cases & Robustness (10,000+ chars split, runtime error fallback, code block preservation)
✔ HistoryManager (isolation, sliding window, TTL cleanup)
✔ Message Splitter (paragraphs, sentence boundary, unicode handling)
✔ Telegram Sender Utilities (formatSources, safeReply fallback)
ℹ tests 41 passed, 0 failed
```

---

## 📂 Cấu trúc thư mục mã nguồn

```
telegram-ai-bot/
├── .env.example              # Mẫu biến môi trường
├── .gitignore                # Danh sách file loại trừ git
├── package.json              # Khai báo thư viện & scripts
├── tsconfig.json             # Cấu hình TypeScript ES2022 / NodeNext
├── start.bat                 # Script chạy nhanh 1-click cho Windows
├── src/
│   ├── index.ts              # Entry point: kiểm tra cấu hình, khởi động bot
│   ├── config.ts             # Schema và logic load biến môi trường
│   ├── bot.ts                # Khởi tạo grammY bot, các command và router tin nhắn
│   ├── ai/
│   │   ├── types.ts          # Định nghĩa kiểu dữ liệu IAIService, ChatMessage
│   │   ├── gemini.ts         # Service kết nối Google Gemini API (@google/genai)
│   │   ├── history.ts        # Quản lý bộ nhớ ngữ cảnh hội thoại đa lượt
│   │   └── mock.ts           # Service giả lập dùng cho kiểm thử tự động
│   └── utils/
│       ├── message-splitter.ts # Thuật toán chia nhỏ tin nhắn an toàn cho Telegram
│       └── telegram-sender.ts  # Tiện ích gửi tin với fallback chống lỗi 400 Markdown
└── tests/
    ├── ai-service.test.ts      # Kiểm thử service AI
    ├── bot.test.ts             # Kiểm thử các lệnh bot Telegram
    ├── history.test.ts         # Kiểm thử quản lý lịch sử
    ├── message-splitter.test.ts # Kiểm thử cắt nhỏ tin nhắn & bảo toàn code block
    ├── telegram-sender.test.ts  # Kiểm thử fallback gửi tin và nguồn tham khảo
    └── edge-cases.test.ts       # Kiểm thử tải nặng và trường hợp ngoại lệ
```
