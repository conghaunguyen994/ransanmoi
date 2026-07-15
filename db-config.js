// db-config.js
// Cấu hình thông tin kết nối Supabase API của bạn

// Thay thế bằng thông tin Project của bạn từ Supabase Dashboard -> Settings -> API
const SUPABASE_URL = "https://jxcykgizdxrcswyayaxh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bSMjdJCy4MJvR6wLUngGtg_3B7OSkIg";

// Khởi tạo Supabase client trên window object
window.supabaseClient = null;
if (typeof supabase !== 'undefined') {
    // Chỉ cần kiểm tra xem khoá đã được điền và khác giá trị giữ chỗ mặc định
    if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_URL_HERE" && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY_HERE") {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client initialized successfully.");
    } else {
        console.warn("Vui lòng điền Supabase URL và Anon Key trong db-config.js để sử dụng tính năng Online.");
    }
}
