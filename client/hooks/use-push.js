import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

// Utility function to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking push subscription:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Izin notifikasi tidak diberikan.");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const { data } = await api.get("/push/vapid-public-key");
      const publicKey = data?.data?.publicKey;

      if (!publicKey) {
        toast.error("Gagal mendapatkan kunci VAPID dari server.");
        return false;
      }

      const vapidKey = urlBase64ToUint8Array(publicKey);

      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        // Send to backend
        await api.post("/push/subscribe", subscription);
        setIsSubscribed(true);
        toast.success("Notifikasi berhasil diaktifkan!");
        return true;
      } catch (subErr) {
        console.error("PushManager.subscribe failed:", subErr);
        if (subErr.name === "AbortError") {
          toast.error(
            "Gagal registrasi (Browser Service Error). Coba 'Clear Site Data' di DevTools lalu coba lagi.",
          );
        } else {
          toast.error(`Gagal mengaktifkan notifikasi: ${subErr.message}`);
        }
        return false;
      }
    } catch (err) {
      console.error("Error in subscribeToPush:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await api.post("/push/unsubscribe", {
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
      toast.success("Notifikasi dimatikan.");
      return true;
    } catch (err) {
      console.error("Error unsubscribing:", err);
      toast.error("Gagal mematikan notifikasi.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isSubscribed, loading, subscribe, unsubscribe };
}
