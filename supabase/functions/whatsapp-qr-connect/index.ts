import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lazy import Baileys to reduce cold start
const importBaileys = async () => {
  const mod = await import("https://esm.sh/@whiskeysockets/baileys@6.7.8?target=deno&no-check");
  return mod as any;
};

Deno.serve((req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    return new Response("Expected WebSocket connection", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let sock: any = null;

  socket.onopen = () => {
    console.log("WebSocket opened");
    socket.send(JSON.stringify({ type: "ready", message: "WebSocket connected" }));
  };

  socket.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data ?? "{}");
      console.log("Received message:", msg);

      if (msg?.action === "start") {
        const phoneNumber = msg.phone_number || "session";
        
        socket.send(JSON.stringify({ type: "status", status: "initializing" }));

        // Initialize Supabase
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Save session to database
        await supabase.from("whatsapp_sessions").upsert({
          phone_number: phoneNumber,
          status: "initializing",
          is_active: false,
        });

        // Import Baileys
        const {
          default: makeWASocket,
          useMultiFileAuthState,
          fetchLatestBaileysVersion,
          DisconnectReason,
          Browsers,
        } = await importBaileys();

        socket.send(JSON.stringify({ type: "status", status: "generating_qr" }));

        // Create temporary auth state
        const authPath = `/tmp/wa-qr-${Date.now()}`;
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
          version,
          printQRInTerminal: false,
          browser: Browsers.macOS("Desktop"),
          auth: state,
        });

        // Save credentials on update
        sock.ev.on("creds.update", async () => {
          await saveCreds();
        });

        // Listen for QR code
        sock.ev.on("connection.update", async (update: any) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            console.log("QR Code generated");
            socket.send(JSON.stringify({ 
              type: "qr", 
              qr: qr,
              message: "امسح رمز QR بكاميرا واتساب"
            }));
            
            await supabase.from("whatsapp_sessions").upsert({
              phone_number: phoneNumber,
              status: "waiting_for_scan",
              qr_code: qr,
              is_active: false,
            });
          }

          if (connection === "close") {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log("Connection closed", statusCode, shouldReconnect);
            
            socket.send(JSON.stringify({ 
              type: "status", 
              status: "disconnected",
              shouldReconnect 
            }));

            await supabase.from("whatsapp_sessions").update({
              status: "disconnected",
              is_active: false,
              disconnected_at: new Date().toISOString(),
            }).eq("phone_number", phoneNumber);

            if (!shouldReconnect) {
              socket.close();
            }
          }

          if (connection === "open") {
            console.log("Connection opened successfully!");
            socket.send(JSON.stringify({ 
              type: "connected",
              message: "✅ تم الاتصال بنجاح!",
              phoneNumber: sock.user?.id?.split(":")[0]
            }));

            await supabase.from("whatsapp_sessions").update({
              phone_number: sock.user?.id?.split(":")[0] || phoneNumber,
              status: "connected",
              is_active: true,
              connected_at: new Date().toISOString(),
            }).eq("phone_number", phoneNumber);
          }

          if (connection === "connecting") {
            socket.send(JSON.stringify({ type: "status", status: "connecting" }));
          }
        });

        // Listen for incoming messages
        sock.ev.on("messages.upsert", async (m: any) => {
          const message = m.messages[0];
          if (!message.key.fromMe && message.message) {
            const from = message.key.remoteJid;
            const text = message.message.conversation || 
                        message.message.extendedTextMessage?.text || 
                        "";

            console.log("Incoming message from", from, ":", text);

            socket.send(JSON.stringify({
              type: "message",
              from,
              text,
              timestamp: message.messageTimestamp,
            }));

            // Save to database
            await supabase.from("whatsapp_messages").insert({
              from_number: from,
              to_number: phoneNumber,
              message_content: text,
              message_type: "text",
              status: "received",
              is_reply: true,
            });
          }
        });

      } else if (msg?.action === "disconnect") {
        if (sock) {
          await sock.logout();
          socket.send(JSON.stringify({ type: "status", status: "logged_out" }));
        }
        socket.close();
      }

    } catch (error: any) {
      console.error("WebSocket error:", error);
      socket.send(JSON.stringify({ 
        type: "error", 
        message: error?.message || "حدث خطأ غير متوقع",
        details: String(error)
      }));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
    if (sock) {
      sock.end();
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});
