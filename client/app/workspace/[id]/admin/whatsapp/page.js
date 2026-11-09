"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/contexts/workspace-context";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowLeft,
  QrCode,
  Sparkles,
  Smartphone,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function AdminWhatsAppPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentWorkspace, loading: wsLoading } = useWorkspace();

  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [testForm, setTestForm] = useState({ number: "", message: "" });
  const [sendingTest, setSendingTest] = useState(false);

  // Cek otorisasi
  useEffect(() => {
    if (!wsLoading && currentWorkspace) {
      if (currentWorkspace.role !== "owner") {
        toast.error("Akses ditolak. Halaman ini hanya untuk Owner workspace.");
        router.push(`/workspace/${id}`);
      } else {
        fetchData();
        // Polling status setiap 10 detik
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [wsLoading, currentWorkspace, id, router]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchLogs()]);
    setLoading(false);
  };

  const fetchStatus = async () => {
    try {
      const { data } = await api.get(`/workspaces/${id}/whatsapp/status`);
      if (!data.data.connected && !data.data.qrCodeStr) {
        // Jika disconnected dan belum ada QR, coba fetch QR explictly
        const qrRes = await api.get(`/workspaces/${id}/whatsapp/qr`);
        if (qrRes.data.data?.qrCodeStr) {
          setStatus({
            ...data.data,
            qrCodeStr: qrRes.data.data.qrCodeStr,
          });
          return;
        }
      }
      setStatus(data.data);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await api.get(`/workspaces/${id}/whatsapp/logs?limit=10`);
      setLogs(data.data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api.post(`/workspaces/${id}/whatsapp/reconnect`);
      toast.success("Mencoba menghubungkan ulang WhatsApp...");
      setTimeout(fetchStatus, 3000);
      setTimeout(fetchStatus, 6000);
      setTimeout(fetchStatus, 10000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghubungkan ulang");
    } finally {
      setReconnecting(false);
    }
  };

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testForm.number || !testForm.message) {
      toast.error("Nomor dan pesan wajib diisi");
      return;
    }

    setSendingTest(true);
    try {
      await api.post(`/workspaces/${id}/whatsapp/test`, testForm);
      toast.success("Pesan percobaan ditambahkan ke antrian");
      setTestForm({ number: "", message: "" });
      setTimeout(fetchLogs, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal mengirim pesan");
    } finally {
      setSendingTest(false);
    }
  };

  const renderStatusBadge = (logStatus) => {
    switch (logStatus) {
      case "sent":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
            Dikirim
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-[10px] font-semibold rounded-full px-2 py-0.5">
            Gagal
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="secondary" className="text-[10px] font-semibold rounded-full px-2 py-0.5">
            Tertunda
          </Badge>
        );
    }
  };

  if (wsLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold">Memeriksa koneksi WhatsApp Gateway...</p>
      </div>
    );
  }

  // Jika bukan owner, tidak usah render apa-apa (sudah diredirect di useEffect)
  if (currentWorkspace?.role !== "owner") return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/workspace/${id}/settings`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Pengaturan
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            Admin WhatsApp Gateway
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kelola sesi WhatsApp Web untuk mengirimkan notifikasi deadline, broadcast event, dan info Baitul Maal
          </p>
        </div>

        <Badge
          variant="outline"
          className="self-start sm:self-auto px-3 py-1 text-xs rounded-full font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10"
        >
          Owner Area
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="rounded-2xl border border-border/80 shadow-xs bg-card/90 backdrop-blur-xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Status Perangkat
              </h3>
              {status?.connected ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Terhubung
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1">
                  <XCircle className="w-3 h-3" /> Terputus
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tautkan akun WhatsApp organisasi melalui pemindaian QR code
            </p>
          </div>

          <div className="space-y-4">
            {!status?.connected && status?.qrCodeStr ? (
              <div className="flex flex-col items-center justify-center p-6 border rounded-2xl bg-muted/20 border-border/80">
                <div className="p-3 bg-white rounded-2xl shadow-sm border mb-4">
                  <img
                    src={status.qrCodeStr}
                    alt="WhatsApp QR Code"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground max-w-xs leading-relaxed">
                  Buka <strong>WhatsApp &rarr; Menu &rarr; Perangkat Tertaut</strong>, lalu arahkan kamera ke kode di atas.
                </p>
              </div>
            ) : !status?.connected && !status?.qrCodeStr ? (
              <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-muted/20 border-dashed border-border/80">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-xs text-center text-muted-foreground font-medium">
                  Menyiapkan kode QR sesi baru...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-emerald-500/[0.04] border-emerald-500/20">
                <div className="h-14 w-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-sm text-foreground">
                  WhatsApp Gateway Aktif
                </h3>
                <p className="text-xs text-center text-muted-foreground mt-1 max-w-xs">
                  Sesi tertaut dan siap mendistribusikan notifikasi secara real-time.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                Antrian pesan:{" "}
                <span className="font-bold text-foreground">
                  {status?.queueLength || 0}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                disabled={reconnecting}
                className="rounded-xl h-8 text-xs font-semibold gap-1.5 shadow-2xs"
              >
                {reconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {status?.connected ? "Hubungkan Ulang" : "Segarkan QR"}
              </Button>
            </div>
          </div>
        </div>

        {/* Test Message Card */}
        <div className="rounded-2xl border border-border/80 shadow-xs bg-card/90 backdrop-blur-xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Uji Coba Pengiriman
            </h3>
            <p className="text-xs text-muted-foreground">
              Kirim pesan simulasi ke nomor pribadi untuk memverifikasi fungsionalitas bot
            </p>
          </div>

          <div>
            {status?.connected ? (
              <form onSubmit={handleTestSend} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nomor WhatsApp Tujuan
                  </label>
                  <Input
                    placeholder="Contoh: 081234567890 atau 62812..."
                    value={testForm.number}
                    onChange={(e) =>
                      setTestForm({ ...testForm, number: e.target.value })
                    }
                    disabled={sendingTest}
                    className="rounded-xl h-10 text-xs bg-background/50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Format lokal (08...) atau internasional (628...)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Teks Pesan
                  </label>
                  <Textarea
                    placeholder="Halo! Ini pesan tes otomatis dari aplikasi Project Manager."
                    value={testForm.message}
                    onChange={(e) =>
                      setTestForm({ ...testForm, message: e.target.value })
                    }
                    rows={3}
                    disabled={sendingTest}
                    className="rounded-xl text-xs bg-background/50 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sendingTest || !status.connected}
                  className="w-full rounded-xl h-10 text-xs font-semibold gap-2 shadow-xs active:scale-[0.98] transition-all"
                >
                  {sendingTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Kirim Pesan Tes</span>
                </Button>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10">
                <ShieldAlert className="w-10 h-10 text-amber-500 mb-2 opacity-60" />
                <p className="text-xs font-semibold text-foreground">
                  Perangkat Belum Terhubung
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Selesaikan pemindaian QR code di sebelah kiri untuk menguji pengiriman pesan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border/80 shadow-xs bg-card/90 backdrop-blur-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Log Riwayat Pengiriman
            </h3>
            <p className="text-xs text-muted-foreground">
              10 pesan pemberitahuan terakhir yang diproses oleh antrian bot
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-xs border rounded-xl border-dashed border-border/80">
            Belum ada riwayat pengiriman pesan WhatsApp.
          </div>
        ) : (
          <div className="border border-border/70 rounded-xl overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Penerima</TableHead>
                  <TableHead className="text-xs font-semibold">Tipe Notifikasi</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Percobaan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">
                        {log.recipientId?.name || "Unknown"}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {log.recipientNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-medium rounded-md">
                        {log.notificationType?.replace?.("_", " ") || "Pesan"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(log.status)}
                      {log.error && (
                        <div
                          className="text-[10px] text-destructive mt-1 max-w-[150px] truncate"
                          title={log.error}
                        >
                          {log.error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs text-muted-foreground tabular-nums"
                        title={new Date(log.createdAt).toLocaleString("id-ID")}
                      >
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                          locale: localeId,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground font-semibold">
                      {log.attempts || 0}x
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
