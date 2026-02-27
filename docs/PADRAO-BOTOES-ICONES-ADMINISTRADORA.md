# Padrão corporativo: botões com ícones e status/tipo (Administradora)

Este documento define o padrão visual para **botões de ação com ícones** e para **badges de status/tipo** nas páginas em `/administradora`, garantindo aspecto corporativo e consistente.

---

## 1. Botões de ação com ícones (tabelas)

### Estilo
- **Variant:** `outline`
- **Tamanho:** `h-8 w-8 p-0` (botão quadrado, ícone centralizado)
- **Bordas:** `rounded-md`
- **Espaçamento entre botões:** `gap-1.5`

### Cores
- **Ações neutras** (visualizar, editar, gerar fatura, ativar/desativar):
  - `border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300`
- **Ação destrutiva** (excluir/remover):
  - Em repouso: mesmo estilo neutro (`border-slate-200 text-slate-500`)
  - No hover: `hover:border-red-200 hover:bg-red-50 hover:text-red-700`

### Ícones sugeridos (Lucide)
| Ação            | Ícone        |
|-----------------|-------------|
| Visualizar/Ver  | `FileSearch`|
| Editar          | `Pencil`    |
| Gerar fatura    | `FileText`  |
| Ativar/Desativar| `Power`     |
| Excluir/Remover | `UserMinus` |

### Exemplo (JSX)
```tsx
<div className="flex items-center justify-end gap-1.5">
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleVisualizar(item)}
    className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
    title="Visualizar"
  >
    <FileSearch className="h-4 w-4" />
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleExcluir(item)}
    className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 rounded-md"
    title="Excluir do grupo"
  >
    <UserMinus className="h-4 w-4" />
  </Button>
</div>
```

---

## 2. Status e tipo (badges corporativos)

### Estilo base
Use `<span>` (não `<Badge>`) com:
- `inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border`

### Cores por significado
- **Ativo / positivo / concluído:**  
  `bg-slate-100 text-slate-800 border-slate-300`
- **Inativo / neutro / cancelado:**  
  `bg-gray-100 text-gray-600 border-gray-300`
- **Atenção / pendente / processando:**  
  `bg-amber-50 text-amber-800 border-amber-200`
- **Numérico / contagem (ex.: total):**  
  `bg-slate-50 text-slate-700 border-slate-200`

### Exemplo (JSX)
```tsx
// Status ativo/inativo
<span
  className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
    item.ativo ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-gray-100 text-gray-600 border-gray-300"
  }`}
>
  {item.ativo ? "Ativo" : "Inativo"}
</span>

// Tipo (ex.: titular/dependente)
<span
  className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
    tipo === "titular" ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-gray-100 text-gray-600 border-gray-300"
  }`}
>
  {tipo === "titular" ? "Titular" : "Dependente"}
</span>
```

---

## 3. Páginas onde o padrão já foi aplicado

- `app/administradora/(dashboard)/grupos-beneficiarios/page.tsx` (lista de grupos)
- `app/administradora/(dashboard)/grupos-beneficiarios/[id]/page.tsx` (detalhes do grupo e tabela de clientes)
- `app/administradora/(dashboard)/clientes/page.tsx`
- `app/administradora/(dashboard)/fatura/page.tsx`
- `app/administradora/(dashboard)/fatura/devedores/page.tsx`

Ao criar ou alterar tabelas e ações em outras páginas da administradora, use este padrão para manter a consistência.
