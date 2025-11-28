# 🚀 Guia de Inicialização Rápida - GAC

## Para Desenvolvedores

### Setup Inicial (faça uma única vez)

#### Backend
```powershell
cd backend
npm install
npm run prisma-migrate
```

#### Frontend
```powershell
cd frontend
npm install
```

### Executar a Aplicação

#### Terminal 1 - Backend
```powershell
cd backend
npm run dev
```
Esperado: `🚀 Servidor GAC iniciado na porta 3001`

#### Terminal 2 - Frontend
```powershell
cd frontend
npm run dev
```
Esperado: `VITE v5.4.21 ready in XXX ms → Local: http://localhost:5173/`

### Acessar a Aplicação
1. Abra navegador em: **http://localhost:5173**
2. Clique em "Registre-se aqui"
3. Crie sua conta
4. Comece a usar!

---

## 📚 Comandos Úteis

### Backend

```bash
npm run dev              # Modo desenvolvimento (recarrega automático)
npm start               # Modo produção
npm run prisma-migrate  # Criar/atualizar banco de dados
npm run prisma-reset    # Resetar banco (DELETE ALL DATA!)
```

### Frontend

```bash
npm run dev     # Modo desenvolvimento
npm run build   # Gerar build para produção (pasta dist/)
npm run preview # Pré-visualizar build gerado
```

---

## 🔍 Verificação de Saúde

### Backend
```bash
curl http://localhost:3001/api/saude
```
Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2025-11-27T..."
}
```

---

## 🐛 Se Algo Não Funcionar

### Backend não conecta
```bash
cd backend
rm prisma/dev.db        # Deletar banco
npm run prisma-migrate  # Recriar banco
npm run dev             # Reiniciar
```

### Frontend com erro de porta
```bash
# Se porta 5173 já está em uso
cd frontend
npm run dev -- --port 5174
```

### Limpar tudo e começar do zero
```bash
# Backend
cd backend
rm -r node_modules prisma/dev.db
npm install
npm run prisma-migrate

# Frontend
cd frontend
rm -r node_modules
npm install
```

---

## 🎯 Dados de Teste

Pode criar conta com qualquer email/senha válidos:

**Exemplo de Pessoa a Cadastrar:**
- Nome: João da Silva
- CPF: 12345678901 (será formatado automaticamente)
- Email: joao@email.com
- Telefone: 11999999999
- Endereço: Rua Principal, 123
- Bairro: Centro
- Cidade: São Paulo
- Estado: SP
- CEP: 01310100
- Benefício: Cesta Básica
- Data: 27/11/2025

---

## 📞 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Token inválido | Faça logout e login novamente |
| CPF não aceita | Remova formatação ou refaça (123.456.789-00) |
| Página branca no frontend | Verifique se backend está rodando |
| "Cannot GET /" no backend | Normal - API está em `/api/*` |
| CORS error | Backend e frontend estão em portas certas? |

---

## 📖 Mais Informações

Para guia completo: veja `README.md` na raiz do projeto
