import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()

app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://gbpinheiro1.github.io/filmesparecidos.com/",
      "https://filmesparecidos-com.onrender.com",
    ],
  }),
)

app.get("/api/search", async (req, res) => {
  const filmId = req.query.q
  const api_key = process.env.API_KEY

  if (!filmId) {
    return res.status(400).json({ error: "Query vazia" })
  }

  if (!api_key) {
    return res.status(500).json({ error: "API_KEY não carregada no servidor" })
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?include_adult=false&language=pt-BR&query=${encodeURIComponent(filmId)}&page=1&api_key=${api_key}`,
    )

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Erro na resposta da TMDB" })
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: "Erro interno no servidor" })
  }
})

// Função para evitar repetir código em todas as rotas
async function tmdbFetch(endpoint, params = {}, res) {
  const api_key = process.env.API_KEY
  if (!api_key) {
    return res.status(500).json({ error: "API_KEY ausente no servidor" })
  }

  // Criar os parâmetros de busca e inserir a api_key
  const searchParams = new URLSearchParams(params)
  searchParams.append("api_key", api_key)

  // url final
  const url = `https://api.themoviedb.org/3${endpoint}?${searchParams.toString()}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      console.error("Erro TMDB:", data)
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (err) {
    console.error("Erro interno:", err.message)
    res.status(500).json({ error: "Erro interno no servidor" })
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

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando!")
})
