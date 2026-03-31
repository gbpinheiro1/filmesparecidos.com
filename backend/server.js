console.log("Node iniciou server.js")

import express from "express"
import cors from "cors"
import dotenv from "dotenv"

// Carrega o dotenv APENAS se não estiver rodando no Railway
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

const app = express()

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://gbpinheiro1.github.io",
      ]
      // Permite requisições sem origem (como aplicativos mobile ou ferramentas como Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Não permitido pelo CORS"))
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
)

app.use(express.json())

//Teste para o servidor do Railway
app.get("/", (req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/search", (req, res) => {
  const filmId = req.query.q

  if (!filmId) {
    return res.status(400).json({ error: "Query vazia" })
  }

  // Usando a sua função tmdbFetch que já trata os erros bonitinho!
  tmdbFetch(
    "/search/movie",
    {
      include_adult: "false",
      language: "pt-BR",
      query: filmId,
      page: "1",
    },
    res,
  )
})

// Função para evitar repetir códigos em todas as rotas
async function tmdbFetch(endpoint, params = {}, res) {
  const api_key = process.env.API_KEY

  if (!api_key) {
    console.error("ERRO CRÍTICO: API_KEY não foi encontrada no process.env!")
    return res.status(500).json({ error: "API_KEY ausente no servidor" })
  }

  const searchParams = new URLSearchParams(params)
  searchParams.append("api_key", api_key)

  const url = `https://api.themoviedb.org/3${endpoint}?${searchParams.toString()}`

  // Loga no Railway a URL que estamos tentando acessar (escondendo a chave por segurança)
  console.log(`Buscando na TMDB: https://api.themoviedb.org/3${endpoint}`)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Erro retornado pela TMDB:", data)
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (err) {
    console.error("Erro interno ao buscar na TMDB:", err.message)
    res
      .status(500)
      .json({ error: "Erro interno no servidor", detalhes: err.message })
  }
}
// Rota 1: Pegar detalhes do filme
app.get("/api/movie/:id", (req, res) => {
  const id = req.params.id // <-- DEFININDO O ID AQUI
  if (id === "null" || id === "undefined" || !id) {
    return res.status(400).json({ error: "ID do filme inválido." })
  }
  tmdbFetch(`/movie/${id}`, { language: "pt-BR" }, res)
})

// Rota 2: Pegar posters
app.get("/api/movie/:id/images", (req, res) => {
  const id = req.params.id
  if (id === "null" || id === "undefined" || !id) {
    return res.status(400).json({ error: "ID do filme inválido." })
  }
  tmdbFetch(`/movie/${id}/images`, { include_image_language: "en-US" }, res)
})

// Rota 3: Pegar keywords
app.get("/api/movie/:id/keywords", (req, res) => {
  const id = req.params.id
  if (id === "null" || id === "undefined" || !id) {
    return res.status(400).json({ error: "ID do filme inválido." })
  }
  tmdbFetch(`/movie/${id}/keywords`, {}, res)
})

// Rota 4: Recomendações - Camada 1
app.get("/api/movie/:id/recommendations", (req, res) => {
  const id = req.params.id
  if (id === "null" || id === "undefined" || !id) {
    return res.status(400).json({ error: "ID do filme inválido." })
  }
  tmdbFetch(
    `/movie/${id}/recommendations`,
    { language: "pt-BR", page: req.query.page || 1 },
    res,
  )
})

// Rota 5: Recomendações - Camada 2 (Similares)
app.get("/api/movie/:id/similar", (req, res) => {
  const id = req.params.id
  if (id === "null" || id === "undefined" || !id) {
    return res.status(400).json({ error: "ID do filme inválido." })
  }
  tmdbFetch(`/movie/${id}/similar`, { language: "pt-BR", page: 1 }, res)
})

// Rota 6: Recomendações - Camada 3 (Discover)
app.get("/api/discover", (req, res) => {
  tmdbFetch(
    `/discover/movie`,
    {
      include_adult: false,
      include_video: false,
      language: "pt-BR",
      ...req.query,
    },
    res,
  )
})

const port = process.env.PORT || 3000

app.listen(port, "0.0.0.0", () => {
  console.log(`>>>> SERVIDOR ATIVO NA PORTA ${port} <<<<`)
})
