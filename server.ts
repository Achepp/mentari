import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent set according to instructions
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Waring: GEMINI_API_KEY is not set in environment variables!");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Helper to get first name capitalized properly (e.g. "GHIBRAN ARYASENA AVIYANTO" -> "Ghibran")
const getFirstName = (fullName: string): string => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0];
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

// API Endpoint to generate feedback for a single student response
app.post("/api/generate-student-feedback", async (req, res) => {
  try {
    const { topic, studentName, studentAnswer, style } = req.body;

    if (!topic || !studentName || !studentAnswer) {
      return res.status(400).json({ error: "Missing required fields: topic, studentName, or studentAnswer" });
    }

    const ai = getGeminiClient();
    const firstName = getFirstName(studentName);
    
    // Construct the prompt based on style
    let styleInstruction = "";
    if (style === "singkat") {
      styleInstruction = `Berikan umpan balik yang SANGAT SINGKAT, bersahabat, komunikatif, dan natural layaknya dosen merespon langsung postingan diskusi mahasiswa di forum.
ATURAN UTAMA:
- Gunakan bahasa yang ramah, hangat, dan santai/percakapan natural (conversational).
- Batasi panjang umpan balik HANYA 10–20 kata.
- Sebutkan nama panggilan/nama depan mahasiswa (${firstName}).
- Berikan apresiasi singkat dan hubungkan langsung secara spesifik dengan poin utama yang disampaikan oleh mahasiswa dalam jawabannya.
- Buat umpan balik unik dan personal agar tidak terkesan robotik/templat berulang.
- JANGAN memberikan skor, nilai, atau penggarisan akademis yang kaku.
- Batasi umpan balik hanya dalam 1 (satu) kalimat saja.`;
    } else if (style === "apresiatif") {
      styleInstruction = "Berikan umpan balik yang sangat apresiatif, hangat, memuji kelebihan jawaban mahasiswa, dan mendorong semangat belajarnya.";
    } else if (style === "motivatif") {
      styleInstruction = "Berikan umpan balik yang memotivasi, memberi inspirasi, memantik rasa ingin tahu lebih dalam, dan menyarankan poin eksplorasi berikutnya.";
    } else if (style === "kritis") {
      styleInstruction = "Berikan umpan balik akademis yang kritis konstruktif, menantang logika berpikir mahasiswa, mengoreksi kekeliruan teoretis jika ada, dan menyarankan perbaikan metodologis dengan bahasa sopan.";
    } else {
      // "formal" or default
      styleInstruction = "Berikan umpan balik yang formal secara akademis, objektif, berorientasi pada standar ilmiah, serta memberikan poin tambahan teoretis yang relevan.";
    }

    let prompt = "";
    if (style === "singkat") {
      prompt = `Anda adalah seorang Dosen Akademik senior Indonesia. Tugas Anda adalah memberikan tanggapan/umpan balik diskusi yang personal, hangat, komunikatif, dan sangat singkat untuk seorang mahasiswa bernama "${studentName}" (mohon panggil dia dengan nama depannya saja: "${firstName}") berdasarkan jawabannya pada diskusi topik berikut.

Topik Diskusi/Pertanyaan:
"${topic}"

Jawaban Mahasiswa (${studentName}):
"${studentAnswer}"

Instruksi Sangat Ketat:
1. Sapa mahasiswa dengan nama depannya saja: "${firstName}".
2. Umpan balik HARUS ditulis dalam hanya 1 (satu) kalimat ringkas.
3. Batasi total kata antara 10 sampai maksimum 20 kata.
4. Berikan apresiasi ramah/hangat lalu sebutkan poin utama yang dia bahas secara alami dan relevan.
5. Gunakan gaya bahasa Indonesia yang kasual, mengayom, fasih, bersahabat, dan alami (conversational). Hindari kekakuan akademis formal.
6. JANGAN memberikan nilai (grades/scores), koreksi kaku teoretis, atau embel-embel paragraf tambahan.
7. JANGAN tambahkan tanda petik dua ganda mengelilingi seluruh tanggapan Anda. Tuliskan tanggapan secara langsung.
8. Buat umpan balik yang unik sesuai isi jawaban agar tidak terasa seragam jika ada banyak mahasiswa.

Contoh format tanggapan:
- "Bagus sekali ${firstName}, penjelasanmu tentang bagaimana data mining membantu menemukan pola data sangat tepat dan relevan."
- "Terima kasih ${firstName}, paparan Anda mengenai analisis perilaku konsumen di e-commerce ini sangat akurat."
- "Kerja bagus ${firstName}, kamu berhasil menekankan pentingnya integrasi proses bisnis dengan tepat."`;
    } else {
      prompt = `Anda adalah seorang Dosen Akademik senior Indonesia. Tugas Anda adalah memberikan umpan balik (feedback) atau tanggapan diskusi yang personal dan edukatif untuk seorang mahasiswa bernama "${studentName}" berdasarkan jawabannya pada diskusi topik berikut.

Topik Diskusi/Pertanyaan:
"${topic}"

Jawaban Mahasiswa (${studentName}):
"${studentAnswer}"

Gaya Bahasa & Instruksi Khusus:
${styleInstruction}

Aturan Penulisan:
1. Sapa mahasiswa dengan sopan (contoh: "Terima kasih ${studentName} atas tanggapannya...", "Penjelasan yang menarik, ${studentName}...", "Jawaban yang komprehensif, ${studentName}...").
2. Berikan analisis atau koreksi logis terhadap esensi argumen/jawaban mereka secara spesifik.
3. Berikan nilai tambah (insight baru, teori tambahan, atau saran perbaikan).
4. Gunakan Bahasa Indonesia yang baik, komunikatif, profesional, dan mengayom sebagai dosen pendidik.
5. JANGAN menuliskan metadata, kode, atau intro lain. Tuliskan umpan balik secara langsung agar siap dicopy-paste.`;
    }

    // Helper function to handle fallback and retry with jittered exponential backoff
    const generateFeedbackWithFallback = async (promptText: string) => {
      const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
      const maxRetries = 2; // retries per model

      for (const modelName of models) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`Generating with ${modelName} (Attempt ${attempt}/${maxRetries})...`);
            const rsp = await ai.models.generateContent({
              model: modelName,
              contents: promptText,
              config: {
                temperature: 0.7,
              },
            });
            if (rsp && rsp.text) {
              return rsp.text;
            }
          } catch (err: any) {
            console.error(`Error on ${modelName} (Attempt ${attempt}):`, err.message || err);
            
            // If it's the absolute last attempt across all models, throw the original error
            const isLastAttempt = modelName === models[models.length - 1] && attempt === maxRetries;
            if (isLastAttempt) {
              throw err;
            }

            // Exponential backoff with jitter
            const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            console.log(`Retrying in ${Math.round(backoffMs)}ms due to error...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }
      throw new Error("Unable to obtain response from any Gemini model.");
    };

    const feedbackText = await generateFeedbackWithFallback(prompt);
    return res.json({ name: studentName, feedback: feedbackText.trim() });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return res.status(500).json({ 
      error: "Failed to generate feedback", 
      details: error.message || error.toString() 
    });
  }
});

// Setup Vite on development, or serve static assets on production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduFeedback AI Server is running on port ${PORT}`);
  });
}

startServer();
