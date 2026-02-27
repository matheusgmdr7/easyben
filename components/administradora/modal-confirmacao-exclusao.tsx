"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type ModalConfirmacaoExclusaoProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descricao: string
  textoConfirmar?: string
  textoCancelar?: string
  onConfirm: () => void | Promise<void>
  carregando?: boolean
}

/**
 * Modal de confirmação para exclusão/remoção (padrão administradora).
 * Use para excluir grupo, beneficiário, etc., com mensagem contextual.
 */
export function ModalConfirmacaoExclusao({
  open,
  onOpenChange,
  titulo,
  descricao,
  textoConfirmar = "Excluir",
  textoCancelar = "Cancelar",
  onConfirm,
  carregando = false,
}: ModalConfirmacaoExclusaoProps) {
  async function handleConfirm() {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-slate-200 bg-white shadow-lg sm:rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-slate-900">
            {titulo}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600">
            {descricao}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            disabled={carregando}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {textoCancelar}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={carregando}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {carregando ? "Excluindo..." : textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ModalConfirmacaoExclusao
