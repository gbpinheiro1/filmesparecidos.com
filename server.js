import express from "express"
import cors from "cors"

const app = express()

// CORS liberado para tudo temporariamente para teste
app.use(cors())
app.use(express.json())

// Rota raiz para o Railway ver que estamos vivos
app.get("/", (req, res) => {
  console.log("-> Alguém acessou a rota raiz!")
  res.json({ status: "ok", mensagem: "Servidor Rodando Perfeitamente!" })
})

// Rota de busca "fake" só para testar a comunicação
app.get("/api/search", (req, res) => {
  const query = req.query.q
  console.log(`-> Busca realizada com o termo: ${query}`)
  res.json({
    results: [
      {
        id: 1,
        title: `Filme de teste para: ${query}`,
        popularity: 100,
        release_date: "2026-01-01",
      },
    ],
  })
})

const port = process.env.PORT || 3000

// Ligando o servidor e prendendo o processo
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`>>>> SERVIDOR DEFINITIVAMENTE ATIVO NA PORTA ${port} <<<<`)
})

// Força o Node a não fechar o processo de jeito nenhum
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Processo finalizado.")
  })
})
