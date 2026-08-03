import { createFileRoute } from "@tanstack/react-router";

type Body = {
  mode?: "chat" | "ayah-explanation" | "tafseer-summary";
  language?: string;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

const LANG_NAMES: Record<string, string> = {
  en: "English", ur: "Urdu", ar: "Arabic", bn: "Bengali", id: "Indonesian", tr: "Turkish",
  fr: "French", ru: "Russian", es: "Spanish", hi: "Hindi", ta: "Tamil", ml: "Malayalam", fa: "Persian",
};

const MODEL = "google/gemini-3-flash-preview";

function systemPrompt(mode: Body["mode"], language: string) {
  const base = `You are "Noor", the scholarly Islamic assistant inside the app "Raah e Hidayath". Your reply language is ${language}, and only ${language}. Write every sentence, every heading and every explanation in ${language}, in the script native to ${language}. Never answer in Urdu, Hindi or any other language unless ${language} is that language — even if the question itself is written in another language or contains Arabic or Urdu words. The only exception is a short Arabic quotation from the Quran or hadith, which you always follow immediately with its ${language} meaning.`;

  if (mode === "ayah-explanation") {
    return `${base}

Give a complete, structured explanation (tashreeh) of the Quranic ayah you are given. Always cover, in this order and with these plain-text headings written in ${language}:
1. Word-by-word sense of the key Arabic words.
2. The clear meaning of the ayah.
3. Shan-e-Nuzool (context of revelation) if it is authentically reported; otherwise say it is not established.
4. Tafseer points from mainstream Sunni scholarship — Ibn Kathir, Tabari, Qurtubi, Maarif-ul-Quran, Tafsir as-Sa'di.
5. Practical lessons for daily life.
6. Related ayat and authentic ahadith with exact references.

Never invent a hadith, a narration or a reference. If something is disputed, say so briefly. No markdown symbols, no asterisks — plain readable paragraphs with numbered headings. Aim for 250–450 words.`;
  }

  if (mode === "tafseer-summary") {
    return `${base}

Summarise the classical tafseer of the given ayah faithfully in 150–250 words, keeping the scholars' points and references intact. Plain text only.`;
  }

  return `${base}

You answer any question about Islam without limit: aqeedah, Quran, tafseer, hadith and its grading, fiqh of the four Sunni madhahib, worship, purity, family and inheritance law, halal and haram, Islamic history, seerah, duas, and questions of the heart.

Rules you always follow:
- Ground every answer in the Quran and authentic Sunnah, and cite the surah:ayah number or the collection and hadith number when you quote.
- When the schools of fiqh differ, briefly state the Hanafi, Shafi'i, Maliki and Hanbali positions.
- Never fabricate a hadith, narration, fatwa or reference. If you do not know, say so plainly.
- For medical, legal, marital or financial rulings that depend on a person's exact circumstances, give the general Islamic principle and advise consulting a qualified local scholar or mufti.
- Be warm, respectful and clear. Use short paragraphs and numbered points, never markdown asterisks or hashes.
- Answer the question that was asked, fully — do not cut the answer short.`;
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("The AI assistant is not configured yet.", { status: 500 });

        const language = LANG_NAMES[body.language ?? "en"] ?? "English";
        const messages = [
          { role: "system", content: systemPrompt(body.mode, language) },
          ...(body.messages ?? []).slice(-20),
          ...(body.prompt ? [{ role: "user" as const, content: body.prompt }] : []),
          { role: "system" as const, content: `Reminder: reply entirely in ${language}.` },
        ];


        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: MODEL, messages, stream: true, max_tokens: 4096 }),
          });
        } catch {
          return new Response("Could not reach the assistant. Please check your connection.", { status: 502 });
        }

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          const message =
            upstream.status === 429
              ? "Too many questions at once — please wait a moment and ask again."
              : upstream.status === 402
                ? "The AI allowance for this app has run out. Please add credits to continue."
                : `The assistant could not answer right now. ${detail.slice(0, 200)}`;
          return new Response(message, { status: upstream.status || 500 });
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
                const chunk = parsed.choices?.[0]?.delta?.content;
                if (chunk) controller.enqueue(encoder.encode(chunk));
              } catch {
                /* skip malformed chunk */
              }
            }
          },
          cancel() {
            void reader.cancel();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});