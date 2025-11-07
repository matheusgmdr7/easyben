import { useEffect } from "react"

let modalOverlayCount = 0

const addBodyClass = () => {
  if (typeof document === "undefined") return
  document.body.classList.add("modal-open")
}

const removeBodyClass = () => {
  if (typeof document === "undefined") return
  document.body.classList.remove("modal-open")
}

export function openModalOverlay() {
  modalOverlayCount += 1
  if (modalOverlayCount === 1) {
    addBodyClass()
  }
}

export function closeModalOverlay() {
  modalOverlayCount = Math.max(0, modalOverlayCount - 1)
  if (modalOverlayCount === 0) {
    removeBodyClass()
  }
}

export function useModalOverlay(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return

    openModalOverlay()

    return () => {
      closeModalOverlay()
    }
  }, [isOpen])
}
