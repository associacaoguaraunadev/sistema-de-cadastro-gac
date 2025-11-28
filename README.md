# GAC - Associação Guaraúna de Arte e Cultura
## Sistema de Cadastro de Beneficiários

Um sistema completo e seguro para gerenciar cadastros de beneficiários da GAC, desenvolvido com Node.js, Express, React e Prisma.

### 🎯 Funcionalidades

- ✅ **Autenticação Segura**: Login e registro com JWT e senhas criptografadas com bcrypt
- ✅ **CRUD Completo**: Criar, ler, atualizar e deletar beneficiários
- ✅ **Validação de Dados**: CPF, email, telefone e endereço validados
- ✅ **Busca e Paginação**: Encontre pessoas rapidamente
- ✅ **Interface Intuitiva**: Design profissional com paleta de cores verde
- ✅ **Segurança**: Helmet, rate limiting, CORS configurado
- ✅ **Responsivo**: Funciona em desktop e mobile

### 🏗️ Arquitetura

```
gac_system/
├── backend/                    # Servidor Express + Prisma
│   ├── src/
│   │   ├── index.js           # Entrada principal
│   │   ├── middleware/        # Autenticação, validação, erros
│   │   └── rotas/             # Endpoints de API
│   ├── prisma/
│   │   └── schema.prisma      # Schema do banco de dados
│   ├── .env                   # Variáveis de ambiente
│   └── package.json
│
└── frontend/                  # App React com Vite
    ├── src/
    │   ├── main.jsx           # Entrada React
    │   ├── contexto/          # Context API para autenticação
    │   ├── componentes/       # Componentes reutilizáveis
    │   ├── servicos/          # Cliente API
    │   └── index.css          # Estilos globais
    ├── index.html
    ├── vite.config.js
    └── package.json
```

### 🗄️ Banco de Dados

Campos do modelo **Pessoa**:
- `id` - ID único
- `nome` - Nome completo
- `cpf` - CPF (único, validado)
- `email` - Email opcional
- `telefone` - Telefone opcional
- `endereco` - Endereço
- `bairro`, `cidade`, `estado`, `cep` - Localização
- `tipoBeneficio` - Tipo de benefício
- `dataBeneficio` - Data do benefício
- `observacoes` - Notas adicionais
- `status` - Status (ativo/inativo)
- `dataCriacao` - Data de criação
- `dataAtualizacao` - Data de atualização

Campos do modelo **Usuario**:
- `id` - ID único
- `email` - Email único
- `senha` - Senha criptografada
- `nome` - Nome do usuário
- `funcao` - Função (funcionario/admin)
- `ativo` - Status ativo/inativo

### 🚀 Como Usar

#### 1️⃣ Pré-requisitos
- Node.js v16+
- npm v8+

#### 2️⃣ Instalação e Setup

**Backend:**
```bash
cd backend
npm install
npm run prisma-migrate  # Cria o banco de dados e tabelas
npm run dev             # Inicia servidor em http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev             # Inicia em http://localhost:5173
```

#### 3️⃣ Primeiros Passos

1. Acesse http://localhost:5173
2. Clique em "Registre-se aqui"
3. Crie sua conta com email e senha (mínimo 8 caracteres)
4. Faça login
5. Comece a cadastrar beneficiários!

### 🔐 Segurança

- ✅ Senhas criptografadas com bcrypt (10 rounds)
- ✅ JWT com expiração de 24h
- ✅ Helmet para headers seguros
- ✅ Rate limiting (100 requisições por 15 min)
- ✅ CORS configurado apenas para frontend
- ✅ Validação de entrada em todos os endpoints
- ✅ Proteção contra CPF duplicado
- ✅ Isofação de dados por usuário

### 📊 Endpoints da API

**Autenticação:**
- `POST /api/autenticacao/registrar` - Criar conta
- `POST /api/autenticacao/entrar` - Fazer login
- `GET /api/autenticacao/eu` - Dados do usuário logado

**Pessoas:**
- `GET /api/pessoas` - Listar pessoas (com paginação)
- `GET /api/pessoas/:id` - Obter pessoa por ID
- `POST /api/pessoas` - Criar nova pessoa
- `PATCH /api/pessoas/:id` - Atualizar pessoa
- `DELETE /api/pessoas/:id` - Deletar pessoa

Todos os endpoints de pessoas requerem autenticação (Bearer token).

### 🎨 Paleta de Cores

- **Verde Escuro**: #1b5e20
- **Verde Primário**: #2e7d32
- **Verde Claro**: #c8e6c9
- **Verde Muito Claro**: #e8f5e9

### 📝 Variáveis de Ambiente

**Backend (.env):**
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="seu_segredo_jwt_super_seguro_altere_em_producao"
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

### 🧪 Testando a Aplicação

1. **Criar Conta:**
   - Nome: João Silva
   - Email: joao@exemplo.com
   - Senha: Senha123!

2. **Cadastrar Pessoa:**
   - Nome: Maria Santos
   - CPF: 123.456.789-00
   - Endereço: Rua Principal, 100
   - Benefício: Cesta Básica

3. **Editar:** Clique no ícone de edição
4. **Deletar:** Clique no ícone de lixeira
5. **Buscar:** Use a barra de busca

### 📱 Recursos Avançados

- **Busca em Tempo Real:** Procure por nome, CPF ou email
- **Paginação Inteligente:** 10 pessoas por página
- **Formatação Automática:** CPF, CEP e telefone formatados
- **Validação de CPF:** Algoritmo validador de dígitos verificadores
- **Seleção de Estados:** Todos os 27 estados brasileiros
- **Tipos de Benefício:** Múltiplas opções pré-configuradas
- **Data do Benefício:** Rastreie quando cada benefício foi concedido

### 🔧 Desenvolvimento

**Scripts disponíveis:**

Backend:
```bash
npm run dev              # Iniciar em modo desenvolvimento
npm start               # Iniciar em produção
npm run prisma-migrate  # Executar migrações
npm run prisma-reset    # Resetar banco de dados
```

Frontend:
```bash
npm run dev     # Iniciar servidor de desenvolvimento
npm run build   # Build para produção
npm run preview # Pré-visualizar build
```

### 🐛 Troubleshooting

**Backend não conecta ao banco:**
- Verifique se a pasta `prisma/` existe
- Rode `npm run prisma-migrate` novamente
- Delete `prisma/dev.db` e execute a migração

**Frontend não carrega:**
- Certifique-se que o backend está rodando na porta 3001
- Verifique CORS_ORIGIN no .env do backend
- Limpe cache do navegador (Ctrl+F5)

**Erro "Token inválido":**
- Faça logout e login novamente
- Limpe localStorage do navegador
- Verifique se JWT_SECRET é o mesmo

### 📄 Estrutura de Pastas

```
src/
├── componentes/
│   ├── FormularioAutenticacao.jsx
│   ├── FormularioPessoa.jsx
│   ├── ListaPessoas.jsx
│   ├── RotaPrivada.jsx
│   └── *.css
├── contexto/
│   └── AuthContext.jsx
├── servicos/
│   └── api.js
├── index.css
└── main.jsx
```

### 🚢 Deploy

Para fazer deploy:

1. **Backend (Railway, Heroku, AWS):**
   - Configure variáveis de ambiente
   - Use banco de dados SQLite ou PostgreSQL
   - Deploy da pasta `backend`

2. **Frontend (Vercel, Netlify):**
   - Build: `npm run build`
   - Deploy da pasta `dist`
   - Configure variável de ambiente VITE_API_URL

### 📞 Suporte

Para dúvidas ou problemas, revise:
- Logs do servidor: Verifique console do backend
- Aba Network: Inspecione requisições no DevTools
- Aba Console: Procure por erro messages

### 📜 Licença

Este projeto é propriedade da GAC - Associação Guaraúna de Arte e Cultura.

---

**Desenvolvido com ❤️ em 2025**
