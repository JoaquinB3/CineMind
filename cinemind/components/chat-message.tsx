import { Film, User } from "lucide-react"
import { cn } from "@/lib/utils"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-1",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="size-4" /> : <Film className="size-4" />}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-secondary text-secondary-foreground"
            : "rounded-tl-sm bg-card text-card-foreground ring-1 ring-border",
        )}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap text-pretty">{message.content}</p>
        ) : (
          <TypingDots />
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Escribiendo">
      <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
      <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
      <span className="size-2 animate-bounce rounded-full bg-primary" />
    </span>
  )
}
