"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      const { data } = await api.get("/admin/whatsapp/status");
      if (!data.data.connected && !data.data.qrCodeStr) {
        // Jika disconnected dan belum ada QR, coba fetch QR explictly
        const qrRes = await api.get("/admin/whatsapp/qr");
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
      const { data } = await api.get("/admin/whatsapp/logs?limit=10");
      setLogs(data.data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api.post("/admin/whatsapp/reconnect");
      toast.success("Mencoba menghubungkan ulang WhatsApp...");
      // Poll faster during reconnect
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
      await api.post("/admin/whatsapp/test", testForm);
      toast.success("Pesan percobaan ditambahkan ke antrian");
      setTestForm({ number: "", message: "" });
      setTimeout(fetchLogs, 2000); // refresh logs after a bit
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
          <Badge className="bg-green-500 hover:bg-green-600">Dikirim</Badge>
        );
      case "failed":
        return <Badge variant="destructive">Gagal</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Tertunda</Badge>;
    }
  };

  if (wsLoading || loading) {
    return (
      <div className="flex justify-center items-center h-full p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Jika bukan owner, tidak usah render apa-apa (sudah diredirect di useEffect)
  if (currentWorkspace?.role !== "owner") return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Kelola koneksi WhatsApp untuk notifikasi otomatis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Status Koneksi
              {status?.connected ? (
                <Badge className="bg-green-500 hover:bg-green-600 ml-auto">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Terhubung
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-auto">
                  <XCircle className="w-3 h-3 mr-1" /> Terputus
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Scan QR code menggunakan WhatsApp Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!status?.connected && status?.qrCodeStr ? (
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 border-dashed">
                <img
                  src={status.qrCodeStr}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 border bg-white rounded-md mb-4"
                />
                <p className="text-sm text-center text-muted-foreground max-w-xs">
                  Buka WhatsApp di HP Anda &rarr; Perangkat Taut &rarr; Tautkan
                  Perangkat, lalu scan QR code ini.
                </p>
              </div>
            ) : !status?.connected && !status?.qrCodeStr ? (
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-slate-50 dark:bg-slate-900 border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-center text-muted-foreground">
                  Menyiapkan QR Code...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  WhatsApp Siap Digunakan
                </h3>
                <p className="text-sm text-center text-green-600 dark:text-green-400 mt-1">
                  Notifikasi akan dikirim secara otomatis.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm">
                Antrian:{" "}
                <span className="font-semibold">
                  {status?.queueLength || 0}
                </span>{" "}
                pesan
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                disabled={reconnecting}
              >
                {reconnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {status?.connected ? "Reconnect" : "Refresh"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Message Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Pengiriman</CardTitle>
            <CardDescription>
              Kirim pesan percobaan untuk memastikan koneksi berjalan baik
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status?.connected ? (
              <form onSubmit={handleTestSend} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nomor WhatsApp</label>
                  <Input
                    placeholder="Contoh: 081234567890"
                    value={testForm.number}
                    onChange={(e) =>
                      setTestForm({ ...testForm, number: e.target.value })
                    }
                    disabled={sendingTest}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gunakan format lokal (08...) atau internasional (628...)
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pesan</label>
                  <Textarea
                    placeholder="Ketik pesan percobaan Anda di sini..."
                    value={testForm.message}
                    onChange={(e) =>
                      setTestForm({ ...testForm, message: e.target.value })
                    }
                    rows={3}
                    disabled={sendingTest}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sendingTest || !status.connected}
                  className="w-full"
                >
                  {sendingTest ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Kirim Pesan
                </Button>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="w-12 h-12 text-amber-500 mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Hubungkan WhatsApp terlebih dahulu untuk melakukan pengetesan
                  fitur kirim pesan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Riwayat Pengiriman (Terbaru)</CardTitle>
            <CardDescription>10 pesan terakhir yang dikirim</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Log
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              Belum ada riwayat pengiriman pesan WhatsApp.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Percobaan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        <div className="font-medium">
                          {log.recipientId?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.recipientNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.notificationType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {renderStatusBadge(log.status)}
                        {log.error && (
                          <div
                            className="text-xs text-destructive mt-1 max-w-[150px] truncate"
                            title={log.error}
                          >
                            {log.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-sm"
                          title={new Date(log.createdAt).toLocaleString(
                            "id-ID",
                          )}
                        >
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: localeId,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.attempts || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
