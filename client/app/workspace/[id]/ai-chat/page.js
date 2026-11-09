"use client";

import { use, useEffect } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAiChatContext } from "@/hooks/use-ai-chat";
import { toast } from "sonner";
import { Sparkles, Bot } from "lucide-react";

/** Derive user-friendly error message for toast notification */
function getErrorMessage(error) {
  const msg =
    error?.message ||
    error?.error?.message ||
    (typeof error?.error === "string" ? error.error : null) ||
    String(error);
  if (msg.includes("429") || error?.status === 429) {
    return "Batas penggunaan tercapai. Coba lagi nanti.";
  }
  if (
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("exceeded your current quota")
  ) {
    return "Kuota API telah habis. Periksa billing atau coba lagi nanti.";
  }
  if (msg.includes("AI_RetryError") || msg.includes("Failed after")) {
    if (msg.includes("quota") || msg.includes("Quota exceeded")) {
      return "Kuota API telah habis. Coba lagi nanti.";
    }
    return "Terjadi kesalahan AI. Silakan coba lagi.";
  }
  if (msg.includes("rate") && msg.includes("limit")) {
    return "Terlalu banyak permintaan. Mohon tunggu sebentar.";
  }
  return "Terjadi kesalahan pada AI Chat. Silakan coba lagi.";
}

const SYSTEM_INSTRUCTIONS = `Kamu adalah AI asisten untuk workspace ini di aplikasi Project Management.
Kamu hanya mengetahui data dari workspace yang sedang aktif.

Kemampuanmu:
1. Menjawab pertanyaan berdasarkan data workspace (task, event, member, activity)
2. Membuat task baru jika diminta
3. Mengupdate task yang ada (status, prioritas, dll)
4. Membuat event baru
5. Assign/unassign member ke task
6. Memberikan ringkasan dan statistik workspace
7. Memberikan saran cerdas (prioritas, distribusi kerja, deadline warning)

Aturan:
- Selalu jawab dalam bahasa yang sama dengan pertanyaan user
- Jika tidak yakin, tanyakan klarifikasi kepada user
- Saat melakukan aksi (buat/update), selalu konfirmasi detail sebelum eksekusi
- Jika data tidak ditemukan, sampaikan dengan jelas
- Format respons dengan markdown jika sesuai (bold, list, tabel)
- Gunakan nama member (bukan ID) saat menyebut user
- Sertakan konteks waktu (tanggal, relatif) saat relevan`;

const SUGGESTION_CHIPS = [
  {
    title: "Task overdue",
    message: "Apa saja task yang overdue di workspace ini?",
  },
  {
    title: "Ringkasan minggu ini",
    message: "Berikan ringkasan progress workspace minggu ini",
  },
  {
    title: "Distribusi kerja",
    message: "Siapa yang paling banyak task aktif saat ini?",
  },
  {
    title: "Event mendatang",
    message: "Event apa saja yang akan datang dalam waktu dekat?",
  },
  {
    title: "Saran prioritas",
    message: "Task mana yang sebaiknya diprioritaskan saat ini?",
  },
];

const CHAT_LABELS = {
  title: "AI Chat Agent",
  initial: [
    "Halo! Saya AI asisten untuk workspace ini. Saya bisa membantu kamu dengan:",
    "- Menjawab pertanyaan tentang task, event, dan member\n- Membuat atau mengupdate task\n- Membuat event baru\n- Memberikan ringkasan workspace\n- Saran prioritas dan distribusi kerja\n\nSilakan tanya apa saja!",
  ],
  placeholder: "Ketik pesan atau instruksi... (cth: 'Apa saja task yang overdue?')",
  error: "Terjadi kesalahan. Silakan coba lagi.",
  stopGenerating: "Hentikan",
  regenerateResponse: "Ulangi respons",
};

export default function AiChatPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace, fetchMembers } = useWorkspace();

  useEffect(() => {
    if (currentWorkspace?._id) {
      fetchMembers(currentWorkspace._id);
    }
  }, [currentWorkspace?._id, fetchMembers]);

  useAiChatContext();

  if (!currentWorkspace) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-6 bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-2xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
                AI Copilot Assistant
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                Workspace Context Aware
              </span>
            </div>
            <p className="text-2xs text-muted-foreground truncate">
              Terkoneksi ke workspace:{" "}
              <span className="font-semibold text-foreground">
                {currentWorkspace.name}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden copilot-chat-wrapper">
        <CopilotChat
          instructions={SYSTEM_INSTRUCTIONS}
          labels={CHAT_LABELS}
          suggestions={SUGGESTION_CHIPS}
          className="h-full"
          onError={(error) => {
            toast.error(getErrorMessage(error));
            if (error?.message?.includes("429") || error?.status === 429) {
              return "Batas penggunaan tercapai. Coba lagi nanti.";
            }
          }}
        />
      </div>
    </div>
  );
}
