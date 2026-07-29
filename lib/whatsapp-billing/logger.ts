type LogLevel = "info" | "warn" | "error" | "debug"

type LogPayload = Record<string, unknown>

function emit(level: LogLevel, event: string, payload: LogPayload = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "whatsapp-billing",
    event,
    ...payload,
  })
  if (level === "error") {
    console.error(line)
  } else if (level === "warn") {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const whatsappBillingLog = {
  info: (event: string, payload?: LogPayload) => emit("info", event, payload),
  warn: (event: string, payload?: LogPayload) => emit("warn", event, payload),
  error: (event: string, payload?: LogPayload) => emit("error", event, payload),
  debug: (event: string, payload?: LogPayload) => emit("debug", event, payload),
}
