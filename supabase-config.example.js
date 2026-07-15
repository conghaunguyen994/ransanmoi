// supabase-config.example.js
// Cấu hình thông tin kết nối Supabase API của bạn (Sao chép thành supabase-config.js và điền thông tin thật)

const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

// Khởi tạo Supabase client nếu đã nhúng thư viện
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_URL_HERE" && SUPABASE_ANON_KEY) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client initialized successfully.");
    } else {
        console.warn("Vui lòng điền Supabase URL và Anon Key trong supabase-config.js để sử dụng tính năng Online.");
    }
}
