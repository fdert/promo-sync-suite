import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IMPORTANT: This function upgrades to WebSocket and maintains a live Baileys session ONLY while the page is open
// It generates a REAL WhatsApp pairing code and streams status updates to the browser.
// For an always-on session, we will provision an external worker later.

// Lazy import Baileys inside each connection to reduce cold start impact
const importBaileys = async () => {
  const mod = await import(
    "https://esm.sh/@whiskeysockets/baileys@6.7.8?target=deno&no-check"
  );
  return mod as typeof import("npm:@whiskeysockets/baileys");
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

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "ready" }));
  };

  socket.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data ?? "{}");
      if (msg?.action === "start" && msg?.phone_number) {
        const phone = String(msg.phone_number).replace(/\D/g, "");

        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Mark session as starting
        const { data: sessionRow, error: insertErr } = await supabase
          .from("whatsapp_sessions")
          .insert({
            phone_number: msg.phone_number,
            status: "waiting_for_pairing",
            is_active: false,
          })
          .select()
          .single();
        if (insertErr && insertErr.code !== "23505") {
          // 23505 = unique violation if you have a constraint; ignore it
          throw insertErr;
        }

        socket.send(
          JSON.stringify({ type: "status", status: "connecting" })
        );

        // Import Baileys
        const {
          default: makeWASocket,
          useMultiFileAuthState,
          fetchLatestBaileysVersion,
          DisconnectReason,
          Browsers,
        } = await importBaileys();

        // Use ephemeral FS; session persists only while WS is open
        const authPath = `/tmp/wa-auth-${Date.now()}`;
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
          version,
          printQRInTerminal: false,
          browser: Browsers.macOS("Desktop"),
          auth: state,
        });

        sock.ev.on("creds.update", async () => {
          await saveCreds();
        });

        // Emit pairing code
        if (!state.creds.registered) {
          try {
            const code: string = await sock.requestPairingCode(phone);
            const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
            socket.send(
              JSON.stringify({ type: "pairing_code", pairing_code: formatted })
            );
          } catch (err) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Failed to request pairing code",
                details: String(err?.message || err),
              })
            );
            return;
          }
        }

        // Listen for connection updates
        sock.ev.on("connection.update", async (update: any) => {
          const { connection, lastDisconnect } = update;

          if (connection === "open") {
            socket.send(JSON.stringify({ type: "connected" }));
            await supabase
              .from("whatsapp_sessions")
              .update({
                status: "connected",
                is_active: true,
                connected_at: new Date().toISOString(),
              })
              .eq("phone_number", msg.phone_number);
          } else if (connection === "close") {
            const code = (lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode);
            // 401 = logged out
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            socket.send(
              JSON.stringify({
                type: "disconnected",
                reason: code,
                will_reconnect: shouldReconnect,
              })
            );
            await supabase
              .from("whatsapp_sessions")
              .update({
                status: "disconnected",
                is_active: false,
                disconnected_at: new Date().toISOString(),
              })
              .eq("phone_number", msg.phone_number);
          } else if (connection === "connecting") {
            socket.send(JSON.stringify({ type: "status", status: "connecting" }));
          }
        });

        // Optional: allow client to disconnect
        const closeHandler = async () => {
          try { sock.end?.(); } catch (_) {}
          try { socket.close(); } catch (_) {}
        };

        (socket as any)._onClientClose = closeHandler;
      }

      if (msg?.action === "disconnect") {
        try {
          (socket as any)._onClientClose?.();
        } catch (_) {}
      }
    } catch (err) {
      try {
        socket.send(
          JSON.stringify({ type: "error", message: String(err?.message || err) })
        );
      } catch (_) {}
    }
  };

  socket.onclose = () => {
    // nothing to do; session ends with socket
  };

  socket.onerror = (e) => {
    try {
      socket.send(JSON.stringify({ type: "error", message: String(e) }));
    } catch (_) {}
  };

  return response;
});
