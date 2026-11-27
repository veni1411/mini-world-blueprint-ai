import express from "express";
import multer from "multer";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 60 }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, apiKeyConfigured: Boolean(API_KEY) });
});

app.post("/api/analyze", upload.array("images", 60), async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "Máy chủ chưa được cấu hình GEMINI_API_KEY." });
    const images = req.files || [];
    if (!images.length) return res.status(400).json({ error: "Em chưa chọn ảnh nào." });

    // Gemini accepts multiple inline image parts. Split into groups to stay within request limits.
    const allItems = [];
    const batchSize = 6;
    for (let start = 0; start < images.length; start += batchSize) {
      const batch = images.slice(start, start + batchSize);
      const prompt = `Bạn là trợ lý đọc công thức chế tạo trong game Mini World: CREATA.
Hãy đọc các ảnh đính kèm. Ảnh có thể chứa danh sách vật phẩm cần cho bản thiết kế, hoặc công thức chế tạo.
Trích xuất mọi vật phẩm nhìn thấy rõ. Trả về CHỈ JSON theo schema:
{"items":[{"name":"tên vật phẩm tiếng Việt","required":0,"outputPerCraft":1,"ingredients":[{"name":"tên nguyên liệu","quantity":0}],"notes":"ghi chú ngắn"}]}
Quy tắc:
- required là số lượng bản thiết kế cần; nếu ảnh công thức không có số lượng yêu cầu thì để null.
- outputPerCraft là số sản phẩm nhận được trong một lần chế tạo; nếu không đọc được thì để 1 và ghi chú.
- ingredients là nguyên liệu cho MỘT lần chế tạo, không phải tổng nguyên liệu.
- Không tự đoán chữ/số bị mờ. Nếu không chắc, ghi notes.
- Nếu một ảnh có nhiều công thức, tạo một item cho mỗi sản phẩm.
- Giữ nguyên tên vật phẩm tiếng Việt nếu đọc được.`;
      const parts = [{ text: prompt }];
      for (const file of batch) {
        parts.push({ inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") } });
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.error?.message || `Gemini API lỗi (${response.status})`;
        return res.status(502).json({ error: message });
      }
      const raw = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { return res.status(502).json({ error: "AI trả về dữ liệu chưa đúng định dạng JSON. Em thử chia ảnh thành nhóm nhỏ hơn nhé.", raw }); }
      if (Array.isArray(parsed.items)) allItems.push(...parsed.items);
    }
    res.json({ items: allItems, imageCount: images.length });
  } catch (err) {
    res.status(500).json({ error: err.message || "Có lỗi khi phân tích ảnh." });
  }
});

app.post("/api/calculate", (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const byName = new Map(items.map(x => [String(x.name || "").trim().toLowerCase(), x]));
    const totals = new Map();
    const craftCounts = new Map();
    const warnings = [];
    const visiting = new Set();

    function add(name, qty) {
      const key = String(name || "").trim().toLowerCase();
      if (!key || !qty) return;
      totals.set(key, (totals.get(key) || 0) + qty);
    }
    function expand(name, qty) {
      const key = String(name || "").trim().toLowerCase();
      const item = byName.get(key);
      if (!item || !Array.isArray(item.ingredients) || item.ingredients.length === 0) {
        add(name, qty); return;
      }
      if (visiting.has(key)) {
        warnings.push(`Phát hiện công thức vòng lặp tại: ${item.name}`);
        add(name, qty); return;
      }
      const yieldCount = Math.max(1, Number(item.outputPerCraft) || 1);
      const crafts = Math.ceil(qty / yieldCount);
      craftCounts.set(key, (craftCounts.get(key) || 0) + crafts);
      visiting.add(key);
      for (const ing of item.ingredients) expand(ing.name, crafts * Number(ing.quantity || 0));
      visiting.delete(key);
    }

    for (const item of items) {
      if (item.required !== null && item.required !== undefined && Number(item.required) > 0) {
        expand(item.name, Number(item.required));
      }
    }
    const result = [...totals.entries()].map(([key, quantity]) => ({
      name: byName.get(key)?.name || key, quantity
    })).sort((a,b) => a.name.localeCompare(b.name, "vi"));
    res.json({
      rawMaterials: result,
      craftCounts: [...craftCounts.entries()].map(([key, count]) => ({ name: byName.get(key)?.name || key, count })),
      warnings
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Không tính được nguyên liệu." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Mini World AI running on port ${port}`));
