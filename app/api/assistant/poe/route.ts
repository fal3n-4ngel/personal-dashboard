import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  // Set up headers for Server-Sent Events stream
  const responseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  };

  const key = req.nextUrl.searchParams.get("key");

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!key) {
          sendEvent("text", { text: "Error: Missing API key. Please configure your Poe Server Bot URL with the key parameter, like so: `https://your-domain.com/api/assistant/poe?key=YOUR_KEY`" });
          sendEvent("done", {});
          controller.close();
          return;
        }

        // 1. Authenticate user using Permanent Key
        const fakeHeaders = new Headers();
        fakeHeaders.set("authorization", `Bearer ${key}`);
        
        let session;
        try {
          // Construct fake request for authentication check
          const fakeReq = new NextRequest(req.url, { headers: fakeHeaders });
          session = await requireUser(fakeReq);
        } catch (err: any) {
          sendEvent("text", { text: `Error: Authentication failed. Please verify your Permanent API Key is correct.\nDetail: ${err.message || err}` });
          sendEvent("done", {});
          controller.close();
          return;
        }

        // 2. Parse Poe request body
        let body: any;
        try {
          body = await req.json();
        } catch {
          sendEvent("text", { text: "Error: Invalid request payload." });
          sendEvent("done", {});
          controller.close();
          return;
        }

        const query = body.query || [];
        if (query.length === 0) {
          sendEvent("text", { text: "No input query found." });
          sendEvent("done", {});
          controller.close();
          return;
        }

        const lastMessage = query[query.length - 1]?.content || "";
        
        // Convert Poe history role "assistant" to Gemini sdk role "model"
        const geminiHistory = query.slice(0, -1).map((q: any) => ({
          role: q.role === "assistant" ? "model" : "user",
          parts: [{ text: q.content }]
        }));

        // 3. Delegate execution directly to the existing Gemini Assistant endpoint
        const origin = req.nextUrl.origin;
        const chatRes = await fetch(`${origin}/api/assistant/chat`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: lastMessage,
            history: geminiHistory
          })
        });

        if (!chatRes.ok) {
          const errData = await chatRes.json().catch(() => ({}));
          throw new Error(errData.error || "Assistant execution failed.");
        }

        const chatData = await chatRes.json();
        const replyText = chatData.reply || "";

        // 4. Stream reply back to Poe
        sendEvent("text", { text: replyText });
        sendEvent("done", {});
      } catch (err: any) {
        console.error("Error in Poe webhook handler:", err);
        sendEvent("text", { text: `An error occurred inside the dashboard AI integration: ${err.message || err}` });
        sendEvent("done", {});
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: responseHeaders });
}
