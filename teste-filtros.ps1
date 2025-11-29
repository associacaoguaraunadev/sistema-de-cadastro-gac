#!/usr/bin/env powershell

<#
  🔧 TESTE DIRETO DA API DE FILTROS
  
  Este script testa a API de pessoas com diferentes combinações de filtros
  para verificar se a lógica está funcionando corretamente.
  
  Requisitos:
  - Backend deve estar rodando em http://localhost:3001
  - Você precisa ter um token JWT válido (fazer login primeiro)
#>

param(
  [string]$Token = "",
  [string]$Teste = "todos"
)

if (-not $Token) {
  Write-Host "❌ Token JWT não fornecido!" -ForegroundColor Red
  Write-Host "Uso: .\teste-filtros.ps1 -Token 'seu_token_aqui'" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Como obter o token:" -ForegroundColor Cyan
  Write-Host "1. Faça login no sistema" -ForegroundColor Gray
  Write-Host "2. Abra DevTools (F12)" -ForegroundColor Gray
  Write-Host "3. Vá para aba Application/LocalStorage" -ForegroundColor Gray
  Write-Host "4. Procure por 'token'" -ForegroundColor Gray
  Write-Host "5. Copie o valor" -ForegroundColor Gray
  exit
}

$ApiUrl = "http://localhost:3001/api"
$Headers = @{
  "Authorization" = "Bearer $Token"
  "Content-Type" = "application/json"
}

function Test-Api {
  param(
    [string]$Nome,
    [hashtable]$Params
  )
  
  Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "  $Nome" -ForegroundColor Cyan
  Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
  
  $QueryString = ""
  foreach ($key in $Params.Keys) {
    if ($QueryString) {
      $QueryString += "&"
    }
    $QueryString += "$key=$([System.Web.HttpUtility]::UrlEncode($Params[$key]))"
  }
  
  $Url = "$ApiUrl/pessoas?$QueryString"
  Write-Host "URL: $Url" -ForegroundColor Gray
  
  try {
    $Response = Invoke-RestMethod -Uri $Url -Headers $Headers -Method Get
    
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "   Total: $($Response.total) pessoas"
    Write-Host "   Retornadas: $($Response.pessoas.Count)"
    Write-Host "   Página: $($Response.pagina)/$($Response.paginas)"
    
    if ($Response.pessoas.Count -gt 0) {
      Write-Host "`n   Primeiras 3 pessoas:" -ForegroundColor Yellow
      $Response.pessoas | Select-Object -First 3 | ForEach-Object {
        Write-Host "   - $($_.nome) (CPF: $($_.cpf))" -ForegroundColor White
      }
    }
  }
  catch {
    Write-Host "❌ Erro!" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
      $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $Reader.BaseStream.Position = 0
      $Reader.DiscardBufferedData()
      $ResponseBody = $Reader.ReadToEnd()
      Write-Host "   Response: $ResponseBody" -ForegroundColor Gray
    }
  }
}

# Teste 1: Sem filtros (linha de base)
if ($Teste -eq "todos" -or $Teste -eq "1") {
  Test-Api -Nome "TESTE 1: Sem filtros (baseline)" -Params @{
    "pagina" = "1"
    "limite" = "5"
  }
}

# Teste 2: Busca simples
if ($Teste -eq "todos" -or $Teste -eq "2") {
  Test-Api -Nome "TESTE 2: Busca simples por 'João'" -Params @{
    "busca" = "João"
    "pagina" = "1"
    "limite" = "5"
  }
}

# Teste 3: Filtro avançado - Nome
if ($Teste -eq "todos" -or $Teste -eq "3") {
  $Filtros = @{
    "nome" = @{
      "valor" = "João"
      "operador" = "contem"
    }
  } | ConvertTo-Json -Compress
  
  Test-Api -Nome "TESTE 3: Filtro Nome = 'João'" -Params @{
    "filtros" = $Filtros
    "pagina" = "1"
    "limite" = "5"
  }
}

# Teste 4: Filtro avançado - CPF
if ($Teste -eq "todos" -or $Teste -eq "4") {
  $Filtros = @{
    "cpf" = @{
      "valor" = "123"
      "operador" = "contem"
    }
  } | ConvertTo-Json -Compress
  
  Test-Api -Nome "TESTE 4: Filtro CPF contém '123'" -Params @{
    "filtros" = $Filtros
    "pagina" = "1"
    "limite" = "5"
  }
}

# Teste 5: Múltiplos filtros (Nome AND CPF)
if ($Teste -eq "todos" -or $Teste -eq "5") {
  $Filtros = @{
    "nome" = @{
      "valor" = "João"
      "operador" = "contem"
    }
    "cpf" = @{
      "valor" = "123"
      "operador" = "contem"
    }
  } | ConvertTo-Json -Compress
  
  Test-Api -Nome "TESTE 5: Múltiplos Filtros (Nome='João' AND CPF contém '123')" -Params @{
    "filtros" = $Filtros
    "pagina" = "1"
    "limite" = "5"
  }
}

# Teste 6: Busca + Filtro avançado
if ($Teste -eq "todos" -or $Teste -eq "6") {
  $Filtros = @{
    "email" = @{
      "valor" = "@gmail"
      "operador" = "contem"
    }
  } | ConvertTo-Json -Compress
  
  Test-Api -Nome "TESTE 6: Busca 'João' + Filtro Email contém '@gmail'" -Params @{
    "busca" = "João"
    "filtros" = $Filtros
    "pagina" = "1"
    "limite" = "5"
  }
}

Write-Host "`n✅ Testes concluídos!" -ForegroundColor Green
Write-Host "`nDica: Verifique também o console do backend para os logs detalhados" -ForegroundColor Cyan
