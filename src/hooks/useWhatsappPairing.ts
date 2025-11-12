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
      console.log('🔌 Starting WebSocket connection to whatsapp-pairing-ws...');
      const ws = new WebSocket(
        "wss://pqrzkfpowjutylegdcxj.functions.supabase.co/functions/v1/whatsapp-pairing-ws"
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected, sending start action...');
        ws.send(JSON.stringify({ action: "start", phone_number: phoneNumber }));
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          console.log('📨 WebSocket message received:', data);
          if (data.type === "ready") return;
          if (data.type === "status" && data.status === "connecting") setStatus("connecting");
          if (data.type === "pairing_code") {
            console.log('🔑 Pairing code received:', data.pairing_code);
            setPairingCode(data.pairing_code);
            setStatus("code");
          }
          if (data.type === "connected") {
            console.log('🎉 WhatsApp connected!');
            setIsConnected(true);
            setStatus("connected");
          }
          if (data.type === "disconnected") {
            console.log('⚠️ WhatsApp disconnected');
            setIsConnected(false);
            setStatus("disconnected");
          }
          if (data.type === "error") {
            console.error('❌ WebSocket error:', data.message);
            setError(data.message || "حدث خطأ غير متوقع");
            setStatus("error");
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('❌ WebSocket error event:', e);
        setError("تعذر إنشاء اتصال بالخادم");
        setStatus("error");
      };

      ws.onclose = (e) => {
        console.log('🔌 WebSocket closed:', e.code, e.reason);
        if (!isConnected) setStatus((s) => (s === "connected" ? s : "disconnected"));
      };
    } catch (e: any) {
      console.error('❌ Failed to create WebSocket:', e);
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
