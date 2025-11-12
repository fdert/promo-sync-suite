import { useEffect, useRef, useState } from "react";

export type PairingStatus = "idle" | "connecting" | "code" | "connected" | "disconnected" | "error";

export const useWhatsappPairing = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<PairingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    return () => {
      try { wsRef.current?.close(); } catch (_) {}
      wsRef.current = null;
    };
  }, []);

  const startPairing = (phoneNumber: string) => {
    setError(null);
    setStatus("connecting");
    setPairingCode(null);

    try {
      const ws = new WebSocket(
        "wss://pqrzkfpowjutylegdcxj.functions.supabase.co/functions/v1/whatsapp-pairing-ws"
      );
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: "start", phone_number: phoneNumber }));
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "ready") return;
          if (data.type === "status" && data.status === "connecting") setStatus("connecting");
          if (data.type === "pairing_code") {
            setPairingCode(data.pairing_code);
            setStatus("code");
          }
          if (data.type === "connected") {
            setIsConnected(true);
            setStatus("connected");
          }
          if (data.type === "disconnected") {
            setIsConnected(false);
            setStatus("disconnected");
          }
          if (data.type === "error") {
            setError(data.message || "حدث خطأ غير متوقع");
            setStatus("error");
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        setError("تعذر إنشاء اتصال بالخادم");
        setStatus("error");
      };

      ws.onclose = () => {
        if (!isConnected) setStatus((s) => (s === "connected" ? s : "disconnected"));
      };
    } catch (e: any) {
      setError(e?.message || "تعذر البدء");
      setStatus("error");
    }
  };

  const stop = () => {
    try {
      wsRef.current?.send(JSON.stringify({ action: "disconnect" }));
      wsRef.current?.close();
    } catch (_) {}
    wsRef.current = null;
  };

  return {
    startPairing,
    stop,
    status,
    pairingCode,
    isConnected,
    error,
  } as const;
};
