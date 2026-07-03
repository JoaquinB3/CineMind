"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUp, Clapperboard, Film, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage, type Message } from "@/components/chat-message"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  "Is this movie safe to watch with kids?",
  "Give me a family-friendly movie for tonight",
  "Best animated movies that adults will also love",
  "Recommend 3 non-stop action movies",
]

function createId() {
  return Math.random().toString(36).slice(2)
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasMessages = messages.length > 0

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setError(null)
      const userMessage: Message = { id: createId(), role: "user", content: trimmed }
      const assistantId = createId()

      const history = [...messages, userMessage]
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }])
      setInput("")
      setIsLoading(true)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        })

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? "No se pudo obtener una respuesta.")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          )
        }

        if (!acc.trim()) {
          throw new Error("El modelo no devolvió ninguna respuesta.")
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ocurrió un error inesperado."
        setError(msg)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setIsLoading(false)
        textareaRef.current?.focus()
      }
    },
    [isLoading, messages],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Encabezado */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              CineBot
            </h1>
            <p className="text-xs text-muted-foreground">Tu asistente de cine</p>
          </div>
        </div>

        {hasMessages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([])
              setError(null)
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Nueva charla</span>
          </Button>
        )}
      </header>

      {/* Conversación */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {!hasMessages ? (
            <Welcome onPick={(s) => void send(s)} disabled={isLoading} />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
            </div>
          )}

          {error && (
            <div className="mx-auto mt-6 max-w-xl rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Entrada */}
      <div className="border-t border-border bg-background px-4 py-4 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-input p-2 focus-within:ring-2 focus-within:ring-ring">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregúntame sobre películas, directores, géneros..."
              rows={1}
              className="max-h-40 min-h-10 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="size-10 shrink-0 rounded-xl"
              aria-label="Enviar mensaje"
            >
              <ArrowUp className="size-5" />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Conectado a un modelo de Ollama. Las respuestas pueden contener errores.
          </p>
        </form>
      </div>
    </div>
  )
}

function Welcome({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center pt-10 text-center sm:pt-16">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Film className="size-7" />
      </div>
      <h2 className="mt-6 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        ¿Qué vemos esta noche?
      </h2>
      <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        Soy CineBot. Pregúntame por recomendaciones, tramas, directores o cualquier
        curiosidad del mundo del cine.
      </p>

      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className={cn(
              "group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm text-card-foreground transition-colors",
              "hover:border-primary/50 hover:bg-accent disabled:opacity-50",
            )}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-pretty">{s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
