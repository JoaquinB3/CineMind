import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

// URL base de tu servidor Ollama. Por defecto apunta a la instancia local.
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434"
// Modelo a usar. Cambialo por el que tengas descargado (ej: "llama3.2", "mistral", etc.)
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2"

const SYSTEM_PROMPT = `Eres Cinemind, un asistente experto en cine y series.
Respondes en español de forma clara, cercana y entusiasta.
Tus áreas: recomendaciones de películas, sinopsis sin spoilers (a menos que te los pidan),
directores, actores, géneros, curiosidades, premios y comparativas.
Si te preguntan algo que no tiene que ver con el cine, redirige amablemente la conversación hacia las películas.
Usa formato breve y legible. No inventes datos: si no estás seguro, dilo.`

type ChatMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

export async function POST(req: NextRequest) {
  let messages: ChatMessage[] = []

  try {
    const body = await req.json()
    messages = Array.isArray(body?.messages) ? body.messages : []
  } catch {
    return new Response(JSON.stringify({ error: "Cuerpo de la petición inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No hay mensajes para procesar." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  let ollamaRes: Response
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    })
  } catch {
    return new Response(
      JSON.stringify({
        error: `No se pudo conectar con Ollama en ${OLLAMA_URL}. Asegurate de que esté en ejecución.`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    const detail = await ollamaRes.text().catch(() => "")
    return new Response(
      JSON.stringify({
        error: `Ollama respondió con error (${ollamaRes.status}). ${detail || "Verifica que el modelo esté descargado."}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    )
  }

  // Ollama devuelve NDJSON (un objeto JSON por línea). Lo transformamos en texto plano en streaming.
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = ollamaRes.body!.getReader()
      let buffer = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const json = JSON.parse(trimmed)
              const token = json?.message?.content
              if (token) controller.enqueue(encoder.encode(token))
            } catch {
              // línea parcial o no-JSON, la ignoramos
            }
          }
        }
      } catch {
        // se cerró el stream
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
