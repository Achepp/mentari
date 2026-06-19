import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  Plus, 
  LayoutDashboard, 
  MessageSquare, 
  Brain, 
  TrendingUp, 
  Archive, 
  HelpCircle, 
  LogOut, 
  Settings, 
  Trash2, 
  Copy, 
  Sparkles, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Check, 
  ChevronRight, 
  Info, 
  Calendar, 
  Menu,
  X,
  FileText,
  AlertCircle,
  Award,
  Zap,
  Bot
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

import { StudentResponse, FeedbackSession, FeedbackStyle } from "./types";
import { SAMPLE_SCENARIOS } from "./samples";

export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState<"responses" | "overview" | "lab" | "analytics" | "archive">("responses");
  const [topic, setTopic] = useState<string>("");
  const [rawResponses, setRawResponses] = useState<string>("");
  const [parsedResponses, setParsedResponses] = useState<StudentResponse[]>([]);
  const [feedbackStyle, setFeedbackStyle] = useState<FeedbackStyle>("formal");
  
  // Generation & Server States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Feedback Lab Sandbox States
  const [labPromptGuideline, setLabPromptGuideline] = useState<string>("Fokus pada pemahaman konsep dasar dan berikan rekomendasi bacaan ilmiah tambahan.");
  const [labPersona, setLabPersona] = useState<string>("default"); // default, tegas, santai, detail
  const [labResponseInput, setLabResponseInput] = useState<string>("Nama: Rudi Kurniawan\nJawaban: Data mining itu intinya mencari emas atau informasi berharga dalam bongkahan tanah data besar yang tidak terstruktur.");
  const [labGenerating, setLabGenerating] = useState<boolean>(false);
  const [labFeedbackOutput, setLabFeedbackOutput] = useState<string>("");

  // Class Analytics AI Generation State
  const [classAnalysis, setClassAnalysis] = useState<string>("");
  const [isAnalyzingClass, setIsAnalyzingClass] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Archive & Historical Sessions State
  const [sessionsHistory, setSessionsHistory] = useState<FeedbackSession[]>([]);

  // Load initial historical sessions and current session state from localStorage
  useEffect(() => {
    const cachedHistory = localStorage.getItem("edu_feedback_history");
    if (cachedHistory) {
      try {
        setSessionsHistory(JSON.parse(cachedHistory));
      } catch (e) {
        console.error("Failed to parse history cache", e);
      }
    } else {
      // Seed initial history with sample_3 to populate graphs and archive initially
      const seedHistory = [SAMPLE_SCENARIOS[1], SAMPLE_SCENARIOS[2]];
      setSessionsHistory(seedHistory);
      localStorage.setItem("edu_feedback_history", JSON.stringify(seedHistory));
    }

    // Load active draft if saved
    const cachedTopic = localStorage.getItem("edu_active_topic");
    const cachedRaw = localStorage.getItem("edu_active_raw");
    const cachedStyle = localStorage.getItem("edu_active_style");
    if (cachedTopic) setTopic(cachedTopic);
    if (cachedRaw) setRawResponses(cachedRaw);
    if (cachedStyle) setFeedbackStyle(cachedStyle as FeedbackStyle);
  }, []);

  // Sync active workspace additions as states update
  useEffect(() => {
    localStorage.setItem("edu_active_topic", topic);
    localStorage.setItem("edu_active_raw", rawResponses);
    localStorage.setItem("edu_active_style", feedbackStyle);
    
    // Automatically parse raw string inputs as student types or changes them
    const parsed = parseRawResponses(rawResponses);
    // Merge existing feedback statuses if names match to preserve loaded/generated content
    const merged = parsed.map((newP: StudentResponse) => {
      const existing = parsedResponses.find((oldP: StudentResponse) => oldP.name === newP.name && oldP.content === newP.content);
      if (existing) {
        return {
          ...newP,
          feedback: existing.feedback,
          status: existing.status,
          errorMsg: existing.errorMsg,
          wordCount: existing.wordCount,
          sentiment: existing.sentiment,
          completenessScore: existing.completenessScore
        };
      }
      return newP;
    });
    setParsedResponses(merged);
  }, [topic, rawResponses, feedbackStyle]);

  // Toast manager helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper parser for raw student entries
  const parseRawResponses = (text: string): StudentResponse[] => {
    if (!text.trim()) return [];
    
    const lines = text.split(/\r?\n/);
    const result: StudentResponse[] = [];
    let index = 1;

    // Check if pasted in LMS format (has "Mahasiswa" indicator lines)
    const hasLmsFormat = lines.some(line => line.trim().toLowerCase() === "mahasiswa");

    if (hasLmsFormat) {
      // Find all line indices containing exactly "mahasiswa" (trimmed, case-insensitive)
      const mahasiswaIndices: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().toLowerCase() === "mahasiswa") {
          mahasiswaIndices.push(i);
        }
      }

      // Process each student block
      for (let k = 0; k < mahasiswaIndices.length; k++) {
        const mIdx = mahasiswaIndices[k];

        // 1. Find student name (first non-empty line above "Mahasiswa" index)
        let nameIdx = -1;
        for (let i = mIdx - 1; i >= 0; i--) {
          if (lines[i].trim()) {
            nameIdx = i;
            break;
          }
        }

        if (nameIdx === -1) continue; // Can't find student name
        const rawName = lines[nameIdx].trim();

        // 2. Find date/time line index (first non-empty line below "Mahasiswa" index)
        let dateIdx = -1;
        for (let i = mIdx + 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            dateIdx = i;
            break;
          }
        }

        if (dateIdx === -1) continue; // Can't find date/time line

        // 3. Determine the end of the answer block
        // If there's a next student, our answer block stops before their name line
        let endIdx = lines.length; 
        if (k + 1 < mahasiswaIndices.length) {
          const nextMIdx = mahasiswaIndices[k + 1];
          // Find the name of the next student
          let nextNameIdx = -1;
          for (let i = nextMIdx - 1; i >= 0; i--) {
            if (lines[i].trim()) {
              nextNameIdx = i;
              break;
            }
          }
          if (nextNameIdx !== -1) {
            endIdx = nextNameIdx;
          }
        }

        // 4. Collect lines representing current student's answer
        const answerLines: string[] = [];
        for (let i = dateIdx + 1; i < endIdx; i++) {
          answerLines.push(lines[i]);
        }

        let content = answerLines.join("\n").trim();

        // Clean up leading "Jawaban:" prefix if it exists
        if (content.toLowerCase().startsWith("jawaban:")) {
          content = content.substring(8).trim();
        }

        // Calculate metadata
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const score = Math.min(100, Math.max(30, wordCount * 2 + 15));
        const cleanName = rawName.replace(/^(.*?)(?:,|$)/, "$1").trim();

        result.push({
          id: `parsed_${index++}_${cleanName}`,
          name: cleanName,
          content: content || "(Jawaban kosong / belum diisi)",
          status: "idle",
          wordCount,
          sentiment: wordCount < 15 ? 'Perlu Perbaikan' : wordCount > 35 ? 'Positif' : 'Netral',
          completenessScore: Math.round(score)
        });
      }
    } else {
      // Standard / fallback formatting: Split by "Nama:"
      const studentBlocks = text.split(/(?:^|\n)Nama:\s*/i);
      for (const block of studentBlocks) {
        if (!block.trim()) continue;

        const answerParts = block.split(/(?:\n)Jawaban:\s*/i);
        let name = "";
        let content = "";

        if (answerParts.length >= 2) {
          name = answerParts[0].trim();
          content = answerParts.slice(1).join("\n").trim();
        } else {
          const blockLines = block.split("\n");
          name = blockLines[0].trim();
          content = blockLines.slice(1).join("\n").trim();
        }

        if (name) {
          const cleanName = name.replace(/^(.*?)(?:,|$)/, "$1").trim();
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          const score = Math.min(100, Math.max(30, wordCount * 2 + 15));
          result.push({
            id: `parsed_${index++}_${cleanName}`,
            name: cleanName,
            content: content || "(Jawaban kosong / belum diisi)",
            status: "idle",
            wordCount,
            sentiment: wordCount < 15 ? 'Perlu Perbaikan' : wordCount > 35 ? 'Positif' : 'Netral',
            completenessScore: Math.round(score)
          });
        }
      }
    }
    return result;
  };

  // Preset Scenario loader
  const loadScenario = (scenario: FeedbackSession) => {
    setTopic(scenario.topic);
    setFeedbackStyle(scenario.style as FeedbackStyle);
    
    // Construct Raw input representation
    const textRepresentation = scenario.responses
      .map(r => `Nama: ${r.name}\nJawaban: ${r.content}`)
      .join("\n\n");
    
    setRawResponses(textRepresentation);
    setParsedResponses(scenario.responses);
    triggerToast(`Skenario "${scenario.title}" berhasil di-load ke editor`, "success");
    setActiveTab("responses");
  };

  // Navigation handlers
  const handleNewSession = () => {
    setTopic("");
    setRawResponses("");
    setParsedResponses([]);
    setClassAnalysis("");
    triggerToast("Workspace dibersihkan! Mulai sesi evaluasi diskusi baru.", "success");
    setActiveTab("responses");
  };

  // Bulk generated copy utility
  const handleCopyAll = () => {
    const successFeedbacks = parsedResponses.filter((r: StudentResponse) => r.status === "success" && r.feedback);
    if (successFeedbacks.length === 0) {
      triggerToast("Belum ada feedback AI yang berhasil digenerate untuk dicopy.", "error");
      return;
    }

    const consolidated = successFeedbacks
      .map((s: StudentResponse) => `${s.name.toUpperCase()}:\n${s.feedback}`)
      .join("\n\n");

    navigator.clipboard.writeText(consolidated);
    triggerToast(`Berhasil menyalin ${successFeedbacks.length} masukan mahasiswa ke Clipboard!`, "success");
  };

  // Clean data command
  const handleClearData = () => {
    setTopic("");
    setRawResponses("");
    setParsedResponses([]);
    triggerToast("Data input diskusi dibersihkan.", "info");
  };

  // API Call for Single Student Feedback
  const generateStudentFeedbackAPI = async (
    studentName: string, 
    studentAnswer: string, 
    customStyle?: string
  ): Promise<string> => {
    const styleToUse = customStyle || feedbackStyle;
    const response = await fetch("/api/generate-student-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic,
        studentName: studentName,
        studentAnswer: studentAnswer,
        style: styleToUse
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP Status ${response.status}`);
    }

    const data = await response.json();
    return data.feedback;
  };

  // Bulk Feedback Generation Flow
  const handleGenerateFeedback = async () => {
    if (!topic.trim()) {
      triggerToast("Silakan isi materi atau Pertanyaan Diskusi terlebih dahulu.", "error");
      return;
    }
    
    if (parsedResponses.length === 0) {
      triggerToast("Gagal mendeteksi jawaban mahasiswa. Pastikan format penulisan sudah benar.", "error");
      return;
    }

    setIsGenerating(true);
    triggerToast("Memulai regenerasi feedback diskusi mahasiswa...", "info");

    // Initialize all parsed cards into generating state
    setParsedResponses((prev: StudentResponse[]) => prev.map((p: StudentResponse) => ({ ...p, status: "generating" })));

    // Process students sequentially to prevent rate limiting, and update state live
    const updatedResponses = [...parsedResponses];
    
    for (let i = 0; i < updatedResponses.length; i++) {
      const student = updatedResponses[i];
      try {
        const feedbackResult = await generateStudentFeedbackAPI(student.name, student.content);
        
        updatedResponses[i] = {
          ...student,
          feedback: feedbackResult,
          status: "success"
        };
        // Update live in UI as it finishes
        setParsedResponses([...updatedResponses]);
      } catch (error: any) {
        console.error(`Error generating feedback for ${student.name}:`, error);
        updatedResponses[i] = {
          ...student,
          status: "error",
          errorMsg: error.message || "Gagal menghubungi Gemini AI."
        };
        setParsedResponses([...updatedResponses]);
      }
    }

    setIsGenerating(false);

    // Save successful session into history
    const isAnySuccess = updatedResponses.some(r => r.status === "success");
    if (isAnySuccess) {
      const formattedDate = new Date().toISOString();
      const newSession: FeedbackSession = {
        id: `session_${Date.now()}`,
        title: topic.slice(0, 32) + (topic.length > 32 ? "..." : ""),
        date: formattedDate,
        topic: topic,
        style: feedbackStyle,
        responses: updatedResponses
      };

      const updatedHistory = [newSession, ...sessionsHistory];
      setSessionsHistory(updatedHistory);
      localStorage.setItem("edu_feedback_history", JSON.stringify(updatedHistory));
      triggerToast("Feedback berhasil digenerate dan disimpan ke Riwayat!", "success");
    } else {
      triggerToast("Semak-kembali koneksi server atau API Key di secrets panel.", "error");
    }
  };

  // Individual feedback regeneration
  const handleRegenerateIndividual = async (id: string) => {
    const index = parsedResponses.findIndex((r: StudentResponse) => r.id === id);
    if (index === -1) return;

    if (!topic.trim()) {
      triggerToast("Isi Pertanyaan Diskusi terlebih dahulu.", "error");
      return;
    }

    const student = parsedResponses[index];
    
    // Set just this student to generating
    const updated = [...parsedResponses];
    updated[index] = { ...student, status: "generating", errorMsg: undefined };
    setParsedResponses(updated);

    try {
      const feedbackResult = await generateStudentFeedbackAPI(student.name, student.content);
      updated[index] = {
        ...student,
        feedback: feedbackResult,
        status: "success"
      };
      setParsedResponses(updated);
      triggerToast(`Umpan balik untuk ${student.name} berhasil diperbarui.`, "success");

      // Save back updated session to history or local state if archived
      const cachedHistory = localStorage.getItem("edu_feedback_history");
      if (cachedHistory) {
        const history: FeedbackSession[] = JSON.parse(cachedHistory);
        // If current session is in history, find and update it
        const matchingIndex = history.findIndex(h => h.topic === topic);
        if (matchingIndex !== -1) {
          history[matchingIndex].responses = updated;
          setSessionsHistory(history);
          localStorage.setItem("edu_feedback_history", JSON.stringify(history));
        }
      }
    } catch (e: any) {
      updated[index] = {
        ...student,
        status: "error",
        errorMsg: e.message || "Gagal menghubungi Gemini AI."
      };
      setParsedResponses(updated);
      triggerToast(`Gagal update umpan balik ${student.name}`, "error");
    }
  };

  // Prompt Lab Sandbox Test Flow
  const handleLabSandboxTest = async () => {
    if (!labResponseInput.trim()) {
      triggerToast("Silakan isi draf input mahasiswa di modul Lab.", "error");
      return;
    }

    setLabGenerating(true);
    setLabFeedbackOutput("");

    // Read the single candidate
    const parsedSingle = parseRawResponses(labResponseInput);
    if (parsedSingle.length === 0) {
      setLabFeedbackOutput("Gagal mendeteksi mahasiswa. Gunakan penulisan: 'Nama: Rudi Kurniawan\\nJawaban: ...'");
      setLabGenerating(false);
      return;
    }

    const targetStudent = parsedSingle[0];

    try {
      // Modify target instructions using experimental laboratory states
      const compositeStyle = `eksperimental_lab_${labPersona}`;
      
      const customPromptRule = `
Gaya Persona Khusus Dosen: ${
        labPersona === "tegas" ? "Tegas, langsung pada kebenaran objektif, korektif, ringkas." : 
        labPersona === "santai" ? "Menggunakan bahasa gaul perkuliahan yang hangat, santai tapi mengedukasi." : 
        labPersona === "detail" ? "Sangat ilmiah, mengutip literatur rujukan teoritis, panjang lebar." : 
        "Default Dosen Akademis Indonesia"
      }
Pedoman Evaluasi Lab Tambahan:
"${labPromptGuideline}"
      `;

      // API call with injected custom guidelines
      const response = await fetch("/api/generate-student-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || "Definisi Konsep Terkait Skenario Evaluasi Pendidikan",
          studentName: targetStudent.name,
          studentAnswer: targetStudent.content + ` [Instruksi Laboratorium Tambahan: ${customPromptRule}]`
        })
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      setLabFeedbackOutput(data.feedback);
      triggerToast("Eksperimen masukan di Lab berhasil disusun!", "success");
    } catch (err: any) {
      setLabFeedbackOutput(`Eksperimen Lab Gagal: ${err.message || err.toString()}`);
    } finally {
      setLabGenerating(false);
    }
  };

  // Generate Class-Wide Analytics Report via server
  const handleGenerateClassAnalysis = async () => {
    if (parsedResponses.length === 0) {
      triggerToast("Silakan isi dan jalankan beberapa draf respon mahasiswa terlebih dahulu.", "error");
      return;
    }

    setIsAnalyzingClass(true);
    setClassAnalysis("");

    try {
      const studentDataSummary = parsedResponses.map((r: StudentResponse) => `- ${r.name}: "${r.content}"`).join("\n\n");
      const prompt = `Anda adalah seorang Konsultan Kurikulum dan Penasehat Pedagogis. Analisis secara mendalam rincian diskusi mahasiswa di kelas berikut, sebutkan tingkat pemahaman mereka, temukan kesalahan persepsi kolektif (misconceptions), dan berikan rekomendasi aksi konkret bagi dosen di kuliah selanjutnya.

Topik Diskusi Pokok:
"${topic}"

Berikut draf seluruh jawaban mahasiswa di forum:
${studentDataSummary}

Format keluaran:
1. **Analisis Kesenjangan Pemahaman / Pemecahan Teoretis**: Seberapa paham mahasiswa?
2. **Miskonsepsi Kolektif Terdeteksi**: Adakah jargon atau konsep yang salah kaprah diinterpretasikan?
3. **Draft Materi Penguatan Kuliah Selanjutnya**: 3 poin materi penting untuk diulas di pertemuan baru.
4. **Metodologi Pembelajaran Alternatif**: Tips taktis singkat.

Tulis dalam Bahasa Indonesia yang berbobot secara akademis dan ramah bagi pengajar senior.`;

      const response = await fetch("/api/generate-student-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Analisis Pedagogis Kelas Kolektif",
          studentName: "Dosen Pengampu",
          studentAnswer: prompt
        })
      });

      if (!response.ok) throw new Error("Gagal generate ringkasan diskusi kelas.");

      const data = await response.json();
      setClassAnalysis(data.feedback);
      triggerToast("Laporan analisis kelas kolektif berhasil disusun oleh Gemini!", "success");
    } catch (err: any) {
      setClassAnalysis(`Gagal menyusun analisis: ${err.message || err.toString()}`);
    } finally {
      setIsAnalyzingClass(false);
    }
  };

  // Archive delete session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessionsHistory.filter((s: FeedbackSession) => s.id !== id);
    setSessionsHistory(updated);
    localStorage.setItem("edu_feedback_history", JSON.stringify(updated));
    triggerToast("Sesi riwayat berhasil dihapus.", "info");
  };

  // Statistics calculation for Recharts Graphs
  const totalSentiments = parsedResponses.reduce((acc: Record<string, number>, r: StudentResponse) => {
    acc[r.sentiment || 'Netral'] = (acc[r.sentiment || 'Netral'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sentimentData = Object.entries(totalSentiments).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ["#13696a", "#c4c6cf", "#ba1a1a"];

  const wordCountData = parsedResponses.map((r: StudentResponse) => ({
    name: r.name,
    "Jumlah Kata": r.wordCount || 0,
    "Skor Kelengkapan": r.completenessScore || 0
  }));

  return (
    <div className="flex-1 bg-[var(--color-soft-bg)] text-[#111c2c] min-h-screen font-sans flex flex-col md:flex-row relative">
      
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce shadow-2xl flex items-center gap-3 px-5 py-4 rounded-xl bg-[#002045] text-white border-l-4 border-[#a2eded] max-w-sm">
          <Info size={18} className="text-[#a2eded] shrink-0" />
          <div className="text-sm font-medium">{toast.message}</div>
        </div>
      )}

      {/* Floating Mobile Top Header Nav */}
      <div className="md:hidden w-full h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 sticky top-0 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#002045] flex items-center justify-center text-white font-bold">
            <GraduationCap size={16} />
          </div>
          <span className="font-bold text-[#13696a] text-sm">Feedback Mentari</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 outline-none text-[#002045]"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* SideNavBar- Persistent Desktop , Drawer Mobile */}
      <aside className={`
        fixed md:sticky top-0 h-full w-[280px] bg-[#f0f3ff] border-r border-[#c4c6cf] py-6 px-4 flex flex-col z-40 transition-transform duration-300
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        md:flex shrink-0 h-screen
      `}>
        {/* Brand Header */}
        <div className="mb-6 px-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#002045] flex items-center justify-center text-white font-bold shrink-0 shadow-md">
            <GraduationCap size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-[#1a365d] text-lg leading-tight uppercase tracking-wider">Mentari</h2>
            <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Sistem Informasi</p>
          </div>
        </div>

        {/* Global Action Button - New Session */}
        <button 
          onClick={handleNewSession}
          className="mb-6 w-full bg-[#002045] text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <Plus size={18} />
          New Feedback Session
        </button>

        {/* Direct Side Navigation Items */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab("overview"); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all font-semibold active:scale-98 relative ${
              activeTab === "overview" 
                ? "bg-[#a2eded] text-[#004f50]" 
                : "text-gray-600 hover:bg-gray-150"
            }`}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>

          <button 
            onClick={() => { setActiveTab("responses"); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all font-semibold active:scale-98 relative ${
              activeTab === "responses" 
                ? "bg-[#a2eded] text-[#004f50]" 
                : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <MessageSquare size={18} />
            Student Responses
          </button>

          <button 
            onClick={() => { setActiveTab("lab"); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all font-semibold active:scale-98 relative ${
              activeTab === "lab" 
                ? "bg-[#a2eded] text-[#004f50]" 
                : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <Brain size={18} />
            Feedback Lab
          </button>

          <button 
            onClick={() => { setActiveTab("analytics"); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all font-semibold active:scale-98 relative ${
              activeTab === "analytics" 
                ? "bg-[#a2eded] text-[#004f50]" 
                : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <TrendingUp size={18} />
            Analytics
          </button>

          <button 
            onClick={() => { setActiveTab("archive"); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all font-semibold active:scale-98 relative ${
              activeTab === "archive" 
                ? "bg-[#a2eded] text-[#004f50]" 
                : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <Archive size={18} />
            Archive Riwayat
          </button>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Load Sample Selector right on sidebar */}
          <div className="px-4 py-1">
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-2">Load Demo Skenario</span>
            <div className="flex flex-col gap-1">
              {SAMPLE_SCENARIOS.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => { loadScenario(sc); setIsMobileMenuOpen(false); }}
                  className="text-left text-xs text-gray-600 hover:text-[#13696a] font-medium py-1 px-2 rounded hover:bg-white border border-transparent hover:border-gray-150 transition-all truncate"
                  title={sc.topic}
                >
                  {i + 1}. {sc.title}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto flex flex-col gap-1 border-t border-gray-200 pt-4 px-2">
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            <div className="w-5 h-5 rounded-full bg-[#13696a]/20 flex items-center justify-center text-[#13696a]">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">Koneksi Server Berfungsi</span>
          </div>
          <button 
            onClick={() => triggerToast("Dukungan portal Feedback Mentari aktif di ahmadasepsuhendi@gmail.com", "info")}
            className="flex items-center gap-3 px-3 py-2 text-xs text-gray-600 hover:bg-gray-200/50 rounded-lg text-left font-medium"
          >
            <HelpCircle size={15} />
            Support Helpdesk
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        
        {/* TopNavBar */}
        <header className="bg-white border-b border-gray-200 h-16 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 md:relative z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#13696a] tracking-tight">Feedback Mentari</h1>
            <span className="h-6 w-px bg-gray-200 hidden md:inline"></span>
            
            {/* Top Shortcut tabs */}
            <nav className="hidden md:flex gap-1">
              <button 
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${
                  activeTab === "overview" 
                    ? "text-[#13696a] bg-[#13696a]/10" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab("responses")}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${
                  activeTab === "responses" 
                    ? "text-[#13696a] bg-[#13696a]/10" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Workspace
              </button>
              <button 
                onClick={() => setActiveTab("lab")}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${
                  activeTab === "lab" 
                    ? "text-[#13696a] bg-[#13696a]/10" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Laboratory
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Academic badge counter status */}
            <div className="bg-[#13696a]/15 text-[#13696a] px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold leading-none">
              <Bot size={13} />
              <span>ahmadasepsuhendi@gmail.com</span>
            </div>

            <button 
              onClick={() => triggerToast("Buka Dokumentasi: Silakan pilih Skenario untuk input instan, sesuaikan Nada Umpan Balik, dan klik 'Generate Feedback' bulk.", "info")}
              className="p-1.5 text-gray-500 hover:text-[#002045] hover:bg-gray-100 rounded-lg transition-colors"
              title="Help"
            >
              <HelpCircle size={19} />
            </button>
            
            <button 
              onClick={() => triggerToast("Konfigurasi default tersimpan: model='gemini-3.5-flash', temp=0.7", "info")}
              className="p-1.5 text-gray-500 hover:text-[#002045] hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={19} />
            </button>

            {/* Profile Avatar hotlinked as specified in additional instructions */}
            <div className="w-9 h-9 rounded-full bg-[#1a365d] flex items-center justify-center text-[#86a0cd] font-bold overflow-hidden cursor-pointer border-2 border-[#13696a] shrink-0 ml-2">
              <img 
                alt="Lecturer Profile" 
                className="w-full h-full object-cover" 
                src="https://iili.io/qP7Kxl1.jpg"
              />
            </div>
          </div>
        </header>

        {/* Dynamic Inner Application Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          
          {/* TAB 1: OVERVIEW PAGE */}
          {activeTab === "overview" && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Jumbotron Header Banner */}
              <div className="p-6 md:p-8 bg-gradient-to-r from-[#002045] to-[#13696a] text-white rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-3 max-w-2xl">
                  <span className="text-xs font-bold uppercase py-1 px-2.5 bg-[#a2eded]/25 text-[#a2eded] rounded-full inline-block tracking-wide">Asisten Dosen Pintar</span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Optimalkan Waktu Koreksi Tugas &amp; Evaluasi Diskusi Mahasiswa</h2>
                  <p className="text-[#e7eeff] text-sm md:text-base leading-relaxed">
                    Sistem EduFeedback AI memudahkan dosen merumuskan tanggapan teoretis, apresiasi, serta ulasan bimbingan metodologis secara serentak (bulk) menggunakan model penalaran AI terbaik.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button 
                      onClick={() => setActiveTab("responses")}
                      className="px-5 py-2.5 bg-[#a2eded] hover:bg-opacity-90 text-[#002045] text-xs font-bold rounded-xl shadow transition-all active:scale-95"
                    >
                      Buka Workspace Sekarang
                    </button>
                    <button 
                      onClick={() => loadScenario(SAMPLE_SCENARIOS[0])}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Coba Demo Skenario
                    </button>
                  </div>
                </div>
                {/* Background graphic elements */}
                <div className="absolute right-[-40px] bottom-[-40px] opacity-10 pointer-events-none hidden lg:block">
                  <GraduationCap size={320} className="text-white" />
                </div>
              </div>

              {/* Statistical KPI Widget Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Feedback Dibuat</span>
                    <div className="p-2 bg-[#13696a]/10 text-[#13696a] rounded-lg">
                      <Sparkles size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-[#002045]">
                      {sessionsHistory.reduce((sum, s) => sum + s.responses.length, 0)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Ulasan tanggapan terdistribusi</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rata-Rata Skor Respons</span>
                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                      <Award size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-[#002045]">
                      {Math.round(sessionsHistory.reduce((sum, s) => {
                        const scoreSum = s.responses.reduce((sub, r) => sub + (r.completenessScore || 70), 0);
                        return sum + (scoreSum / (s.responses.length || 1));
                      }, 0) / (sessionsHistory.length || 1))}%
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Kelayakan deskripsi argumen mahasiswa</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Metode Aktif</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Bot size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#002045] capitalize">
                      {feedbackStyle === "formal" ? "Formal Akademik" : feedbackStyle === "singkat" ? "Singkat Komunikatif" : feedbackStyle}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Metode gaya ulasan default saat ini</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sesi Riwayat Tersimpan</span>
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Archive size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-[#002045]">{sessionsHistory.length} Sesi</h3>
                    <p className="text-xs text-gray-500 mt-1">Riwayat evaluasi diskusi lokal</p>
                  </div>
                </div>
              </div>

              {/* Multi-Section Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Quick Load Scenarios Carousel */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-gray-150 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={18} className="text-[#13696a]" />
                      <h4 className="font-bold text-[#002045]">Daftar Topik Diskusi Berbasis Skenario</h4>
                    </div>
                    <span className="text-xs text-[#13696a] font-semibold bg-[#13696a]/10 px-2 py-0.5 rounded-full">3 Templat</span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Instansi Akademis Anda menyediakan templat skenario di bawah ini untuk mensimulasikan keandalan program AI Auto Reply:
                  </p>

                  <div className="space-y-3 pt-1">
                    {SAMPLE_SCENARIOS.map((sc, i) => (
                      <div 
                        key={sc.id}
                        onClick={() => loadScenario(sc)}
                        className="p-3 border border-gray-150 rounded-xl hover:border-[#13696a] hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1.5 min-w-0 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {sc.style.toUpperCase()}
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">
                              {sc.responses.length} Mahasiswa terdata
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-[#002045] group-hover:text-[#13696a] transition-colors truncate">
                            {sc.title}
                          </h5>
                          <p className="text-xs text-gray-500 truncate">{sc.topic}</p>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-[#13696a] transform group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Tips & User guidelines card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
                    <Bot size={18} className="text-[#13696a]" />
                    <h4 className="font-bold text-[#002045]">Panduan Evaluasi</h4>
                  </div>
                  
                  <div className="space-y-3.5 text-xs text-gray-600 leading-relaxed">
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#13696a]/10 text-[#13696a] flex items-center justify-center shrink-0 font-bold">1</div>
                      <p>
                        Pilih <strong>Materi Diskusi</strong> di input panel Workspace. Anda bebas menggunakan contoh skenario instan.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#13696a]/10 text-[#13696a] flex items-center justify-center shrink-0 font-bold">2</div>
                      <p>
                        Tuliskan jawaban mentah diskonstruksi mahasiswa di kolom tengah format: <br />
                        <code className="bg-gray-50 text-[#13696a] px-1 py-0.5 rounded font-mono">Nama: [Nama] \n Jawaban: [Uraian]</code> <br />
                        Pisahkan antar siswa menggunakan enter ganda.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#13696a]/10 text-[#13696a] flex items-center justify-center shrink-0 font-bold">3</div>
                      <p>
                        Pilih <strong>Feedback Style</strong> yang paling mencerminkan target kelulusan mahasiswa pada modul sesi ini.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#13696a]/10 text-[#13696a] flex items-center justify-center shrink-0 font-bold">4</div>
                      <p>
                        Tekan <strong>Generate Feedback</strong> untuk memulai penelaahan otomatis individual. Sesi Anda tersimpan otomatis di Riwayat.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* TAB 2: ACTIVE RESPONSES GENERATOR (Mockup Workspace) */}
          {activeTab === "responses" && (
            <div className="space-y-6">
              
              {/* Screen Title & Subtitle */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-[#002045] mb-1">AI Auto Reply Diskusi Mahasiswa</h2>
                  <p className="text-sm text-gray-500">Generate personalized academic feedback for student discussions in bulk.</p>
                </div>
                
                {/* Floating preset buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-1">Muat Cepat:</span>
                  <button 
                    onClick={() => loadScenario(SAMPLE_SCENARIOS[0])}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-[#13696a]/10 hover:text-[#13696a] border border-gray-250 rounded-lg transition-all"
                  >
                    Data Mining
                  </button>
                  <button 
                    onClick={() => loadScenario(SAMPLE_SCENARIOS[1])}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-[#13696a]/10 hover:text-[#13696a] border border-gray-250 rounded-lg transition-all"
                  >
                    Agile Scrum
                  </button>
                  <button 
                    onClick={() => loadScenario(SAMPLE_SCENARIOS[2])}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-[#13696a]/10 hover:text-[#13696a] border border-gray-250 rounded-lg transition-all"
                  >
                    Keamanan Data
                  </button>
                </div>
              </div>

              {/* Control Panel Header Bar */}
              <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Left controls: Style dropdown selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-sm font-bold text-gray-500 whitespace-nowrap" htmlFor="feedback-style-select">
                    Feedback Style:
                  </label>
                  <div className="relative">
                    <select 
                      id="feedback-style-select"
                      value={feedbackStyle}
                      onChange={(e) => setFeedbackStyle(e.target.value as FeedbackStyle)}
                      className="block w-full sm:w-56 rounded-lg border border-gray-250 py-2.5 pl-3 pr-10 text-[#111c2c] text-sm font-semibold bg-[#f9f9ff] focus:border-[#13696a] focus:ring-2 focus:ring-[#13696a]/20 outline-none appearance-none cursor-pointer"
                    >
                      <option value="formal">Formal Akademik</option>
                      <option value="apresiatif">Apresiatif</option>
                      <option value="motivatif">Motivatif</option>
                      <option value="kritis">Kritis Konstruktif</option>
                      <option value="singkat">Singkat Komunikatif</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                      <ChevronRight size={16} className="transform rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Right controls: Consolidated workspace triggers */}
                <div className="flex items-center gap-2.5 justify-end">
                  <button 
                    onClick={handleClearData}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 border border-gray-250 rounded-xl transition-all flex items-center gap-2 active:scale-95"
                    title="Clear current workspace text inputs"
                  >
                    <Trash2 size={15} />
                    Clear Data
                  </button>

                  <button 
                    onClick={handleCopyAll}
                    className="px-4 py-2.5 text-xs font-bold text-[#13696a] bg-white hover:bg-[#13696a]/5 border border-[#13696a] rounded-xl transition-all flex items-center gap-2 active:scale-95"
                    title="Copy all generated text comments to clipboard"
                  >
                    <Copy size={15} />
                    Copy All
                  </button>

                  <button 
                    onClick={handleGenerateFeedback}
                    disabled={isGenerating}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#13696a] hover:bg-opacity-95 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Generating ({parsedResponses.filter(s => s.status === 'success').length}/{parsedResponses.length})
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Generate Feedback
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* 3 Column Layout Workspace (From Mockup) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1: DISCUSSION TOPIC */}
                <div id="col-discussion-topic" className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-[540px]">
                  {/* Column Header */}
                  <div className="bg-[#e7eeff] py-3.5 px-4 border-b border-gray-200 flex items-center gap-2">
                    <FileText size={18} className="text-[#1a365d]" />
                    <h3 className="text-sm font-bold text-[#1a365d]">Discussion Topic</h3>
                  </div>
                  {/* Textarea Area */}
                  <div className="p-4 flex-1 flex flex-col space-y-2">
                    <textarea 
                      id="topic-input"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="flex-1 w-full rounded-xl border border-gray-200 p-3.5 text-[#111c2c] text-sm leading-relaxed placeholder-gray-400 focus:border-[#13696a] focus:ring-2 focus:ring-[#13696a]/15 transition-all outline-none resize-none scrollbar-custom bg-[#fdfdff]"
                      placeholder="e.g., Jelaskan manfaat Data Mining dalam dunia bisnis."
                    />
                    <div className="text-[11px] text-gray-500 font-medium flex justify-between px-1">
                      <span>Materi pokok / Pertanyaan Dosen</span>
                      <span className="font-semibold text-[#13696a]">{topic.length} karakter</span>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: STUDENT RESPONSES RAW INPUT */}
                <div id="col-student-responses" className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-[540px]">
                  {/* Column Header */}
                  <div className="bg-[#e7eeff] py-3.5 px-4 border-b border-gray-200 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-[#1a365d]" />
                      <h3 className="text-sm font-bold text-[#1a365d]">Student Responses (Raw)</h3>
                    </div>
                    <span className="bg-white text-gray-500 text-[10px] font-black tracking-wider px-2 py-0.5 rounded border border-gray-200">PASTE HERE</span>
                  </div>
                  {/* RAW Textarea Area */}
                  <div className="p-4 flex-1 flex flex-col bg-gray-50/40 space-y-3">
                    <textarea 
                      id="responses-input"
                      value={rawResponses}
                      onChange={(e) => setRawResponses(e.target.value)}
                      className="flex-1 w-full rounded-xl border border-gray-200 p-3.5 text-[#111c2c] text-sm leading-relaxed placeholder-gray-400 focus:border-[#13696a] focus:ring-2 focus:ring-[#13696a]/15 transition-all outline-none resize-none scrollbar-custom bg-white"
                      placeholder={`Paste student responses here...

Format:
Nama: Ahmad
Jawaban: Data mining membantu menemukan pola tersembunyi...

Nama: Budi Santoso
Jawaban: Penjelasan saya tentang efisiensi operasional...`}
                    />
                    {/* Status summary of parsed results */}
                    <div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <Users size={14} className="text-[#13696a]" />
                        <span>Terdeteksi: <strong className="text-[#13696a] font-bold">{parsedResponses.length} Mahasiswa</strong></span>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded leading-none">
                        Parsed Live OK
                      </span>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: AI GENERATED FEEDBACK RESULTS */}
                <div id="col-ai-results" className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-[540px]">
                  {/* Column Header */}
                  <div className="bg-[#1a365d] py-3.5 px-4 border-b border-gray-200 flex items-center gap-2 text-white justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Brain size={18} className="text-[#a2eded]" />
                      <h3 className="text-sm font-bold tracking-tight">AI Generated Feedback</h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded">
                      <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-400 animate-pulse' : 'bg-[#a2eded]'}`}></span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#a2eded]">
                        {isGenerating ? "Processing" : "Ready"}
                      </span>
                    </div>
                  </div>

                  {/* Generated feed list */}
                  <div className="p-4 flex-1 overflow-y-auto scrollbar-custom bg-[#f9f9ff] relative space-y-4">
                    {parsedResponses.length === 0 ? (
                      /* Empty State Overlay */
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-3">
                        <Bot size={48} className="text-gray-300" />
                        <h4 className="font-bold text-sm text-gray-500">Workspace Kosong</h4>
                        <p className="text-xs max-w-[220px]">
                          Ulasan feedback otomatis mahasiswa akan tampil di sini setelah Anda mengisi data dan memicu generasi AI.
                        </p>
                      </div>
                    ) : (
                      parsedResponses.map((student, idx) => (
                        <div 
                          key={student.id} 
                          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-[#13696a]/15 text-[#13696a] flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <h4 className="font-bold text-xs text-[#002045]">{student.name}</h4>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {student.status === "generating" && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin" />
                                  Proses AI...
                                </span>
                              )}
                              {student.status === "error" && (
                                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Error
                                </span>
                              )}
                              {student.status === "success" && (
                                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                                  <CheckCircle2 size={10} />
                                  Ready
                                </span>
                              )}

                              {/* Single copy item */}
                              {student.feedback && (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(student.feedback || "");
                                    triggerToast(`Umpan balik untuk ${student.name} dikopi!`, "success");
                                  }}
                                  className="text-gray-400 hover:text-[#13696a] p-1 rounded hover:bg-gray-150 transition-colors"
                                  title="Copy single feedback"
                                >
                                  <Copy size={13} />
                                </button>
                              )}

                              {/* Single regenerate item trigger */}
                              <button 
                                onClick={() => handleRegenerateIndividual(student.id)}
                                disabled={student.status === "generating" || isGenerating}
                                className="text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-gray-150 transition-all text-xs font-semibold px-1 disabled:opacity-40"
                                title="Regenerate this student only"
                              >
                                {student.status === "success" ? "Rerun" : "Run"}
                              </button>
                            </div>
                          </div>

                          {/* Student's answer quote */}
                          <div className="bg-gray-50/50 p-2.5 rounded-lg border-l-2 border-gray-200 text-[11px] text-gray-500 italic max-h-16 overflow-y-auto scrollbar-custom">
                            "{student.content}"
                          </div>

                          {/* Feedback result */}
                          <div>
                            {student.status === "generating" && (
                              <div className="space-y-2 py-2">
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-11/12"></div>
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5"></div>
                              </div>
                            )}

                            {student.status === "error" && (
                              <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-200 flex flex-col gap-1">
                                <span className="font-bold">Gagal memproses feedback</span>
                                <span className="font-mono text-[10px]">{student.errorMsg}</span>
                              </div>
                            )}

                            {student.status === "success" && student.feedback && (
                              <p className="text-xs leading-relaxed text-gray-700 font-medium whitespace-pre-wrap">
                                {student.feedback}
                              </p>
                            )}

                            {student.status === "idle" && (
                              <p className="text-xs text-gray-400 italic text-center py-2">
                                Menunggu giliran pemrosesan AI...
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}


          {/* TAB 3: FEEDBACK LAB (Prompt Sandbox Laboratory) */}
          {activeTab === "lab" && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[#13696a]">
                  <Brain size={24} />
                  <h2 className="text-xl font-extrabold text-[#002045]">Custom Persona &amp; Feedback Rule Tester</h2>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ruang pengujian laboratorium AI. Di sini Anda dapat merancang aturan prompt bimbingan baru, memilih persona kepenulisan dosen pengampu, dan meninjau langsung hasil koreksi teoritis draf tunggal sebelum diaplikasikan secara massal pada Workspace utama.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Rules controls */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <h3 className="font-bold text-sm text-[#002045] border-b border-gray-150 pb-2">1. Laboratorium Configuration</h3>
                  
                  {/* Select Persona */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 block">Karakter Persona Dosen</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setLabPersona("default")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          labPersona === "default" 
                            ? "bg-[#13696a] text-white border-transparent shadow" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        🎓 Default Akademik
                      </button>
                      <button 
                        onClick={() => setLabPersona("tegas")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          labPersona === "tegas" 
                            ? "bg-[#13696a] text-white border-transparent shadow" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        ⚖️ Tegas Korektif
                      </button>
                      <button 
                        onClick={() => setLabPersona("santai")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          labPersona === "santai" 
                            ? "bg-[#13696a] text-white border-transparent shadow" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        ☕ Santai &amp; Hangat
                      </button>
                      <button 
                        onClick={() => setLabPersona("detail")}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          labPersona === "detail" 
                            ? "bg-[#13696a] text-white border-transparent shadow" 
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        📚 Detail Komprehensif
                      </button>
                    </div>
                  </div>

                  {/* Instruction Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 block">Pedoman Promosi / Aturan Tambahan</label>
                    <textarea 
                      value={labPromptGuideline}
                      onChange={(e) => setLabPromptGuideline(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 h-20 outline-none focus:border-[#13696a] bg-gray-50/50"
                      placeholder="Masukkan aturan evaluasi kurikulum, misal: 'Ingatkan mahasiswa agar menyertakan referensi buku teks koding.'"
                    />
                  </div>

                  {/* Test student model */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 block">Uji Contoh Draf Respon Siswa</label>
                    <textarea 
                      value={labResponseInput}
                      onChange={(e) => setLabResponseInput(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2.5 h-28 outline-none focus:border-[#13696a]"
                    />
                  </div>

                  {/* Trigger call */}
                  <button
                    onClick={handleLabSandboxTest}
                    disabled={labGenerating}
                    className="w-full py-3 bg-[#13696a] hover:bg-opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:bg-gray-300"
                  >
                    {labGenerating ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Mensintesis Ulasan Lab...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Jalankan Simulasi Lab AI 
                      </>
                    )}
                  </button>
                </div>


                {/* Lab generated output comparison */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm flex flex-col">
                  <h3 className="font-bold text-sm text-[#002045] border-b border-gray-150 pb-2">2. Hasil Rekonstruksi Ulasan</h3>
                  
                  <div className="flex-1 overflow-y-auto max-h-[360px] scrollbar-custom bg-gray-50 rounded-xl p-4 border border-gray-150 relative">
                    {labFeedbackOutput ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-[10px] px-2 py-0.5 bg-[#a2eded] text-[#004f50] font-bold rounded-full">
                            Eksperimen Sukses
                          </span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(labFeedbackOutput);
                              triggerToast("Komentar laboratorium disalin!", "success");
                            }}
                            className="text-gray-400 hover:text-[#13696a] p-1.5 rounded bg-white hover:bg-gray-100 border border-gray-200"
                            title="Copy output"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                          {labFeedbackOutput}
                        </p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                        <Bot size={36} className="text-gray-300" />
                        <span className="text-xs font-bold text-gray-400">Belum ada Simulasi Terbuka</span>
                        <p className="text-[11px] max-w-[200px]">
                          Klik tombol di kolom kiri untuk melihat hasil pengolahan sandbox.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border border-[#e7eeff] bg-[#f9f9ff] rounded-xl p-3 text-xs space-y-1.5">
                    <span className="font-bold text-[#1a365d] block">💡 Gunakan Hasil Ini</span>
                    <p className="text-gray-500 leading-relaxed text-[11px]">
                      Jika Anda menyukai karakter ulasan di lab ini, silakan klik tombol di bawah untuk menerapkan pedoman prompt ke Workspace utama.
                    </p>
                    <button 
                      onClick={() => {
                        setFeedbackStyle("formal"); // fallback
                        triggerToast("Pedoman kurikulum disalin ke Workspace. Pilih style Formal Akademik di menu utama untuk merangkum.", "success");
                        setActiveTab("responses");
                      }}
                      className="text-[#13696a] hover:underline font-extrabold text-[11px] block pt-1"
                    >
                      Terapkan sebagai Pedoman Dasar →
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}


          {/* TAB 4: ANALYTICS (Graphs with recharts) */}
          {activeTab === "analytics" && (
            <div className="max-w-5xl mx-auto space-y-6">
              
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#002045]">Visualisator Metrik &amp; Analis Kelas Kolektif</h2>
                  <p className="text-xs text-gray-500 mt-1">Dibuat otomatis berdasarkan sebaran draf data mahasiswa di Workspace aktif.</p>
                </div>
                
                <button
                  onClick={handleGenerateClassAnalysis}
                  disabled={isAnalyzingClass || parsedResponses.length === 0}
                  className="px-5 py-2.5 bg-[#13696a] text-white hover:bg-opacity-95 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm disabled:bg-gray-300"
                >
                  {isAnalyzingClass ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      Susun Ringkasan Pemahaman Kelas (AI)
                    </>
                  )}
                </button>
              </div>

              {parsedResponses.length === 0 ? (
                <div className="bg-white border border-gray-250 p-12 text-center rounded-2xl flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <TrendingUp size={48} className="text-gray-300" />
                  <h3 className="font-bold text-sm text-gray-500">Belum Ada Sebaran Data</h3>
                  <p className="text-xs max-w-sm">
                    Silakan isi dan jalankan beberapa evaluasi mahasiswa di tab Workspace terlebih dahulu sebelum meninjau hasil visualisasi statistik ini.
                  </p>
                  <button 
                    onClick={() => loadScenario(SAMPLE_SCENARIOS[0])}
                    className="px-4 py-2 bg-gray-100 hover:bg-[#13696a]/15 text-[#13696a] text-xs font-bold rounded-xl"
                  >
                    Muat Contoh Skenario Otomatis
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Recharts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Graph 1: Word count count bar */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-xs text-[#002045] tracking-wide uppercase text-gray-500">Daftar Panjang Argumen &amp; Kelengkapan</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={wordCountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#455f88' }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="Jumlah Kata" fill="#13696a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Skor Kelengkapan" fill="#1a365d" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Graph 2: Sentiment distribution pie */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                      <h3 className="font-bold text-xs text-[#002045] tracking-wide uppercase text-gray-500">Sebaran Nada &amp; Sentimen Konstruktif</h3>
                      
                      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                        <div className="w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={sentimentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {sentimentData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Pie legend descriptions */}
                        <div className="space-y-2 text-xs">
                          {sentimentData.map((data, idx) => (
                            <div key={data.name} className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                              <span className="font-medium text-gray-600">{data.name}: <strong>{data.value} Siswa</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                        Sentimen dinilai secara teoretis berdasarkan kepadatan diksi argumentatif mahasiswa.
                      </p>
                    </div>

                  </div>

                  {/* AI Class summary insight report */}
                  {classAnalysis && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md border-t-4 border-[#13696a] space-y-4">
                      <div className="flex items-center gap-2.5">
                        <Bot size={22} className="text-[#13696a]" />
                        <h4 className="font-extrabold text-base text-[#002045]">AI Penasehat Pedagogis: Laporan Ulasan Kelas Kolektif</h4>
                        <span className="ml-auto text-[10px] font-bold text-[#13696a] bg-[#13696a]/15 px-2 py-0.5 rounded leading-none">
                          Terbentuk via Gemini
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-250 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {classAnalysis}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold px-1">
                        <span>Konsultan Kurikulum Digital</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(classAnalysis);
                            triggerToast("Laporan kelas kolektif disalin!", "success");
                          }}
                          className="text-[#13696a] flex items-center gap-1 hover:underline"
                        >
                          <Copy size={10} /> Copas Laporan
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}


          {/* TAB 5: ARCHIVED RIWAYAT SESSIONS */}
          {activeTab === "archive" && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-extrabold text-[#002045]">Riwayat Evaluasi Diskusi</h2>
                  <p className="text-xs text-gray-500 mt-1">Daftar seluruh sesi analisis bulk yang pernah Anda jalankan pada mesin lokal.</p>
                </div>
                <span className="text-xs px-3 py-1 bg-gray-200 text-gray-600 rounded-full font-bold">
                  {sessionsHistory.length} Sesi Terbaca
                </span>
              </div>

              {sessionsHistory.length === 0 ? (
                <div className="bg-white border border-gray-200 p-12 text-center rounded-2xl flex flex-col items-center justify-center text-gray-400 space-y-3 shadow-sm">
                  <Archive size={48} className="text-gray-300" />
                  <h4 className="font-bold text-sm text-gray-500">Belum Ada Riwayat Tersimpan</h4>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Setelah Anda berhasil men-generate ulasan umpan balik pada Workspace, rangkuman sesi akan otomatis diarsipkan di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionsHistory.map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => {
                        setTopic(session.topic);
                        const rawRep = session.responses.map(r => `Nama: ${r.name}\nJawaban: ${r.content}`).join("\n\n");
                        setRawResponses(rawRep);
                        setParsedResponses(session.responses);
                        setFeedbackStyle(session.style as FeedbackStyle);
                        triggerToast(`Draft sesi "${session.title}" berhasil di-load kembali ke editor`, "success");
                        setActiveTab("responses");
                      }}
                      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#13696a] hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                    >
                      <div className="space-y-2 min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#13696a]/10 text-[#13696a] rounded capitalize">
                            Gaya: {session.style}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(session.date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        
                        <h4 className="font-bold text-sm text-[#002045] group-hover:text-[#13696a] transition-colors truncate">
                          {session.title || "Topik tanpa judul"}
                        </h4>
                        
                        <p className="text-xs text-gray-500 leading-relaxed truncate max-w-lg">
                          Topik: "{session.topic}"
                        </p>

                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-gray-400">Siswa yang dimuat:</span>
                          <div className="flex flex-wrap gap-1">
                            {session.responses.map((r, i) => (
                              <span key={i} className="text-[9px] font-bold bg-gray-100 text-[#002045] px-1.5 py-0.5 rounded">
                                {r.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card triggers */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button 
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-150"
                          title="Hapus rekaman riwayat"
                        >
                          <Trash2 size={15} />
                        </button>
                        <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 group-hover:border-[#13696a] rounded-lg text-xs font-bold text-[#13696a] group-hover:bg-[#13696a] group-hover:text-white transition-all flex items-center gap-1">
                          Load Workspace <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
