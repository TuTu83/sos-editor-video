# S.O.S Editor - Website

Este é o repositório do website oficial do **S.O.S Editor**, um editor de vídeos leve e poderoso.
O projeto é composto por um frontend moderno em React e um backend em Node.js.

## 🚀 Como Iniciar

Para rodar o projeto localmente, basta executar o arquivo:
`start_project.bat`

Isso irá abrir:
1. **Backend**: http://localhost:5000
2. **Frontend**: http://localhost:3000

## 📂 Estrutura

- **frontend/**: Interface do usuário (React, Vite, TailwindCSS).
- **backend/**: API e Banco de Dados (Node.js, Express, SQLite).

## 🌐 Deploy (GitHub Pages)

Para atualizar o site no GitHub Pages:

1. Gere a versão de produção:
   ```bash
   cd frontend
   npm run build
   ```
2. O conteúdo será gerado na pasta `frontend/dist`.
3. Faça o upload do conteúdo da pasta `dist` para a branch `gh-pages` ou raiz do seu repositório de hospedagem.

## 🔧 Configuração

As configurações do site (textos, preços, links de download) ficam armazenadas no banco de dados SQLite em `backend/database.sqlite`.
O frontend possui um fallback estático para funcionar mesmo sem o backend (ideal para GitHub Pages).

### Links de Download
- Windows: `v1.0.5`
- Mac/Linux: Em breve
