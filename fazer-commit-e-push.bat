@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Adiciona pastas comuns do Git ao PATH (caso nao esteja configurado)
if exist "C:\Program Files\Git\cmd" set "PATH=C:\Program Files\Git\cmd;%PATH%"
if exist "C:\Program Files\Git\bin" set "PATH=C:\Program Files\Git\bin;%PATH%"
if exist "C:\Program Files (x86)\Git\cmd" set "PATH=C:\Program Files (x86)\Git\cmd;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Git\cmd" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

where git >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado. Instale o Git em https://git-scm.com ou adicione a pasta do git ao PATH.
    echo Ex.: set "PATH=C:\Program Files\Git\cmd;%%PATH%%"
    pause
    exit /b 1
)

echo.
echo === git status ===
git status
echo.

echo === Adicionando arquivos alterados ===
git add app/api/administradora/buscar-operadora-por-cnpj/route.ts
git add "app/administradora/(dashboard)/contrato/novo/page.tsx"
echo.

echo === Commit ===
git commit -m "feat(administradora): desvincular busca de operadora do tenant e permitir cadastro na tela de contrato" -m "- API buscar-operadora-por-cnpj: remove filtro por tenant_id; busca apenas por CNPJ" -m "- Em 404: mensagem orientando preencher e salvar para cadastrar nova operadora" -m "- Pagina contrato/novo: em 404, preenche CNPJ no form, limpa razao/fantasia e toast info"
echo.

echo === Push para GitHub ===
git push
echo.

echo === Concluido ===
