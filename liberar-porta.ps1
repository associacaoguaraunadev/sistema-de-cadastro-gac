#!/usr/bin/env powershell

# Script para matar processo na porta 5173
$porta = 5173

$processosNaPorta = Get-NetTCPConnection -LocalPort $porta -ErrorAction SilentlyContinue | 
    ForEach-Object { Get-Process -Id $_.OwningProcess }

if ($processosNaPorta) {
    Write-Host "❌ Encontrado processo(s) na porta $porta" -ForegroundColor Red
    foreach ($processo in $processosNaPorta) {
        Write-Host "   - $($processo.ProcessName) (PID: $($processo.Id))"
        Stop-Process -Id $processo.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Processo encerrado" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Porta $porta está livre" -ForegroundColor Green
}
