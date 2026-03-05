chosenMovie()
async function chosenMovie() {
  const info = new URLSearchParams(window.location.search)
  const filmId = info.get("movieId")

  if (!filmId || filmId === "null") {
    console.error("ID do filme não encontrado.")
    window.location.href = "index.html"
    return
  }

  var chosen_movie_info = document.querySelector("#chosen_movie_info")
  var chosen_movie_name = document.createElement("p")
  chosen_movie_name.classList.add("chosen_movie_name")
  var chosen_movie_date = document.createElement("p")
  var chosen_movie_poster = document.querySelector("#chosen_movie_poster")

  const response = await fetch(
    `http://localhost:3000/api/movie/${encodeURIComponent(filmId)}`,
  )

  if (!response.ok) {
    console.error("Erro HTTP:", response.status)
    return
  }

  const movie = await response.json()

  if (!movie.title) {
    console.error("Resposta inválida:", movie)
    return
  }

  chosen_movie_name.innerHTML = movie.title

  //ajustar para título completo on hover
  chosen_movie_name.title = `${movie.title} (${movie.release_date.slice(0, 4)})`

  chosen_movie_date.innerHTML = `(${movie.release_date.slice(0, 4)})`
  chosen_movie_info.append(chosen_movie_name, chosen_movie_date)

  var filmsResults = await recommendFilms(movie.title)

  if (!filmsResults) {
    window.location.href = "error.html"
    return
  }

  //garantir que a animação aconteça pelo menos uma vez
  var actualTime = Date.now()
  const minimumTime = 2000 //tempo de uma repetição da animação

  document.querySelector("#loading").remove()
  document.querySelector("#container").style.display = "flex"
  renderCards(filmsResults)

  fetch(`http://localhost:3000/api/movie/${filmId}/images`)
    .then((response) => response.json())
    .then((movie) => {
      if (movie.posters.length > 0) {
        verifyPoster(movie.posters, chosen_movie_poster)
      } else {
        chosen_movie_poster.src = "assets/generic_film_poster.png"
      }
    })
}

async function recommendFilms(film_name) {
  const info = new URLSearchParams(window.location.search)
  const filmId = info.get("movieId")
  const cards = document.querySelector(".cards")
  cards.innerHTML = ""
  var movieGenres = []
  var movieYear = null
  const chosenMovieName = film_name
  await fetch(`http://localhost:3000/api/movie/${filmId}`)
    .then((response) => response.json())
    .then((movie) => {
      movieYear = Number(movie.release_date.slice(0, 4))
      for (let i = 0; i < movie.genres.length; i++)
        if (movie.genres.length > 0) {
          movieGenres.push(movie.genres[i].id)
        }
    })

  if (movieGenres.length >= 3) {
    movieGenres = movieGenres.slice(0, 3)
  }
  if (movieGenres.length === 2) {
    movieGenres = movieGenres.slice(0, 2)
  }

  var filmsResults = []
  // fallback da API em camadas

  var movieKeywords = []
  await fetch(`http://localhost:3000/api/movie/${filmId}/keywords`)
    .then((response) => response.json())
    .then((movie) => {
      if (movie.keywords.length > 8) {
        movieKeywords = movie.keywords
          .slice(0, 8)
          .map((keywords) => keywords.id)
      } else {
        movieKeywords = movie.keywords.map((keywords) => keywords.id)
      }
    })

  var filterContol = [50, 1000]
  var keywordsQuantity = 2
  var chosenKeywords = []
  movieKeywords.length > 0
    ? (chosenKeywords = await strongestKeyword(
        movieKeywords,
        filterContol,
        keywordsQuantity,
      ))
    : ""
  console.log(chosenKeywords)

  var keywordParam = ""

  if (!chosenKeywords || chosenKeywords.length === 0) {
    chosenKeywords = movieKeywords[0]
    keywordParam = `&with_keywords=${chosenKeywords}`
  } else {
    keywordParam = `&with_keywords=${chosenKeywords.join(",")}`
  }

  filmsResults = await discoverMovies(
    `&with_genres=${movieGenres.join(",")}` +
      keywordParam +
      `&vote_average.gte=5.5`,
    filmsResults,
    chosenMovieName,
    movieYear,
    movieGenres,
  )

  //camada 2 (usar apenas 1 keyword)

  if (filmsResults.length < 4 && movieKeywords.length > 0) {
    chosenKeywords = []
    keywordParam = ""
    keywordsQuantity = 1
    filterContol = [50, 200]
    chosenKeywords = await strongestKeyword(
      movieKeywords,
      filterContol,
      keywordsQuantity,
    )

    if (!chosenKeywords || chosenKeywords.length === 0) {
      keywordParam = ""
    } else {
      keywordParam = `&with_keywords=${chosenKeywords.join(",")}`
    }

    filmsResults = await discoverMovies(
      `&with_genres=${movieGenres.join(",")}` +
        keywordParam +
        `&vote_average.gte=5.5`,
      filmsResults,
      chosenMovieName,
      movieYear,
      movieGenres,
    )
  }

  //camada 3
  if (filmsResults.length < 4) {
    var pageNumber = 1
    filmsResults = await recommendedMovies(
      filmId,
      movieYear,
      movieGenres,
      chosenMovieName,
      pageNumber,
      filmsResults,
    )
  }
  // camada 4
  if (filmsResults.length < 4) {
    pageNumber = 2
    filmsResults = await recommendedMovies(
      filmId,
      movieYear,
      movieGenres,
      chosenMovieName,
      pageNumber,
      filmsResults,
    )
  }

  //última camada, caso ainda não tenha completado 4 recomendações
  if (filmsResults.length < 4) {
    filmsResults = await similarMovies(
      filmId,
      movieYear,
      movieGenres,
      chosenMovieName,
      filmsResults,
    )
  }

  if (filmsResults.length === 0) {
    return null
  }
  return filmsResults
}
function renderCards(filmsResults) {
  const cards = document.querySelector(".cards")
  for (let i = 0; i < filmsResults.length; i++) {
    if (cards.children.length >= 4 || filmsResults === null) break

    const card = document.createElement("div")
    card.classList.add("card")
    const title = document.createElement("p")
    const title_wrapper = document.createElement("div")
    title_wrapper.classList.add("title_wrapper")

    const card_bottom = document.createElement("span")

    //card de more info

    card_bottom.addEventListener("click", async () => {
      await moreInfo(filmsResults[i].id)
    })

    const bottom_text = document.createElement("small")
    const button = document.createElement("button")

    title.innerHTML = `${filmsResults[i].title} (${filmsResults[
      i
    ].release_date.slice(0, 4)})`

    // ajustar para título completo on hover
    title.title = `${filmsResults[i].title} (${filmsResults[
      i
    ].release_date.slice(0, 4)})`

    bottom_text.innerHTML = "Pedir mais informações ao Randy"

    card_bottom.append(bottom_text, button)
    title_wrapper.append(title)
    card.appendChild(title_wrapper)

    const poster = document.createElement("img")
    const poster_wrapper = document.createElement("div")
    poster_wrapper.classList.add("poster_wrapper")
    poster.src = `https://image.tmdb.org/t/p/w300/${filmsResults[i].poster_path}`

    poster_wrapper.append(poster)
    card.appendChild(poster_wrapper)
    card.appendChild(card_bottom)
    cards.appendChild(card)
  }
}

function validate(filmData, chosenMovieName, filmsResults) {
  //Evitar duplicatas nas recomendações
  if (filmsResults.some((movie) => movie.id === filmData.id)) {
    return false
  }

  // Evitar recomendações de filmes de uma mesma franquia
  if (filmData.title.toLowerCase().includes(chosenMovieName.toLowerCase())) {
    return false
  }
  //Evitar recomendar filmes sem poster
  if (!filmData.poster_path) {
    return false
  } else {
    return true
  }
}

async function strongestKeyword(movieKeywords, filterContol, keywordsQuantity) {
  // selecionar a keyword mais específica para melhorar as recomendações e deixá-las menos genéricas
  var bestKeywords = []
  var quantity = keywordsQuantity
  for (let i = 0; i < movieKeywords.length; i++) {
    const response = await fetch(
      `http://localhost:3000/api/discover?page=1&with_keywords=${movieKeywords[i]}`,
    )
    const movie = await response.json()
    console.log(movieKeywords)
    if (
      movie.total_results > filterContol[0] &&
      movie.total_results < filterContol[1]
    ) {
      bestKeywords.push({ id: movieKeywords[i], total: movie.total_results })
    }
  }

  bestKeywords = bestKeywords.sort((a, b) => a.total - b.total)
  bestKeywords = bestKeywords.slice(0, quantity).map((k) => k.id)

  return bestKeywords
}

async function recommendedMovies(
  filmId,
  movieYear,
  movieGenres,
  chosenMovieName,
  pageNumber,
  filmsResults,
) {
  const res = await fetch(
    `http://localhost:3000/api/movie/${filmId}/recommendations?page=${pageNumber}`,
  )
  const data = await res.json()
  const currentYear = new Date().getFullYear()
  var commonGenres = 0

  for (let i = 0; i < data.results.length; i++) {
    if (filmsResults.length >= 4) {
      break
    }

    commonGenres = movieGenres.filter((genreId) =>
      data.results[i].genre_ids.includes(genreId),
    ).length

    if (
      movieYear <= currentYear - 12 &&
      commonGenres >= 1 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
      console.log(`recommended e página ${pageNumber}`)
    }
    //Evitar que o algoritmo da TMDB recomende filmes por simples semelhança de ano de lançamento (comportamento de filmes recentes)
    else if (
      movieYear > currentYear - 12 &&
      Math.abs(movieYear - Number(data.results[i].release_date.slice(0, 4))) >
        0 &&
      commonGenres >= 2 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
      console.log(`recommended e página ${pageNumber}`)
    }
  }
  return filmsResults
}

async function similarMovies(
  filmId,
  movieYear,
  movieGenres,
  chosenMovieName,
  filmsResults,
) {
  const res = await fetch(`http://localhost:3000/api/movie/${filmId}/similar`)
  const data = await res.json()
  const currentYear = new Date().getFullYear()

  for (let i = 0; i < data.results.length; i++) {
    if (filmsResults.length >= 4) {
      break
    }
    var commonGenres = 0
    commonGenres = movieGenres.filter((genreId) =>
      data.results[i].genre_ids.includes(genreId),
    ).length

    if (
      movieYear <= currentYear - 12 &&
      commonGenres >= 2 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
    }

    if (
      movieYear > currentYear - 12 &&
      Math.abs(movieYear - Number(data.results[i].release_date.slice(0, 4))) >
        0 &&
      commonGenres >= 1 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
    }
  }
  return filmsResults
}

async function discoverMovies(
  params,
  filmsResults,
  chosenMovieName,
  movieYear,
  movieGenres,
) {
  const url = `http://localhost:3000/api/discover?vote_count.gte=45&sort_by=vote_count.desc&page=1${params}`
  const res = await fetch(url)
  const data = await res.json()

  const currentYear = new Date().getFullYear()
  var commonGenres = 0

  for (let i = 0; i < data.results.length; i++) {
    if (filmsResults.length >= 4) {
      break
    }

    commonGenres = movieGenres.filter((genreId) =>
      data.results[i].genre_ids.includes(genreId),
    ).length

    if (
      validate(data.results[i], chosenMovieName, filmsResults) === true &&
      movieYear <= currentYear - 12 &&
      commonGenres >= 2
    ) {
      filmsResults.push(data.results[i])
      console.log("Discover")
    }
    //Evitar que o algoritmo da TMDB recomende filmes por simples semelhança de ano de lançamento (comportamento de filmes recentes)
    else if (
      movieYear > currentYear - 12 &&
      Math.abs(movieYear - Number(data.results[i].release_date.slice(0, 4))) >
        0 && //evita recomendações genéricas por ano de lançamento em comum
      commonGenres >= 2 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
      console.log("Discover")
    }
  }
  return filmsResults
}

async function hasValidPoster(movieId) {
  const res = await fetch(`http://localhost:3000/api/movie/${movieId}/images`)
  const data = await res.json()

  return data.posters && data.posters.length > 0
}

function verifyPoster(posters, posterImage) {
  var cont = 0
  function nextPoster() {
    if (cont >= posters.length) {
      return
    }

    const url = `https://image.tmdb.org/t/p/w300/${posters[cont].file_path}`
    const img = new Image()

    img.src = url

    img.onload = () => {
      posterImage.src = url
    }

    img.onerror = () => {
      cont++
      nextPoster()
    }
  }
  nextPoster()
}

//Para usar na função moreInfo()
let last_section = null

async function moreInfo(movieId) {
  const res = await fetch(`http://localhost:3000/api/movie/${movieId}`)
  const data = await res.json()

  const container = document.querySelector("#container")
  //refresh das informações num novo clique
  if (last_section) {
    last_section.remove()
  }
  last_section = document.createElement("section")
  last_section.classList.add("more_info")

  var more_info_header = document.createElement("header")
  more_info_header.classList.add("more_info_header")

  var more_info_robot = document.createElement("img")
  more_info_robot.src = "assets/robot_profile_picture.png"

  const more_info_quote = document.createElement("p")
  more_info_quote.classList.add("more_info_quote")
  more_info_quote.innerHTML =
    "Beleza, novato! Aqui vão algumas informações sobre o filme para você se situar um pouco."

  more_info_header.appendChild(more_info_robot)
  more_info_header.appendChild(more_info_quote)

  const more_info_title = document.createElement("p")
  more_info_title.classList.add("more_info_title")
  more_info_title.innerHTML = `${data.title} (${data.release_date.slice(0, 4)})`

  const more_info_details = document.createElement("div")
  more_info_details.classList.add("more_info_details")

  const more_info_genres = document.createElement("p")
  more_info_genres.classList.add("more_info_p")
  more_info_genres.innerHTML = `Gêneros: ${data.genres.map((k) => k.name).join(", ")}.`

  const more_info_overview = document.createElement("p")
  more_info_overview.classList.add("more_info_overview")
  more_info_overview.innerHTML = `Sinopse: ${data.overview}`

  const more_info_runtime = document.createElement("p")
  more_info_runtime.classList.add("more_info_p")
  var runtime_quote = ""

  more_info_details.append(
    more_info_genres,
    more_info_overview,
    more_info_runtime,
  )

  const more_info_return = document.createElement("a")
  more_info_return.classList.add("more_info_return")
  more_info_return.innerHTML = "Descobrir mais filmes"
  more_info_return.addEventListener("click", (changePage) => {
    window.location.href = "index.html"
  })
  if (Number(data.runtime) <= 90) {
    runtime_quote = "(É curtinho, dá para assistir hoje mesmo!)"
  }

  if (Number(data.runtime) >= 150) {
    runtime_quote = "(Esse é longo, hein? Perfeito para uma tarde de domingo!)"
  }
  more_info_runtime.innerHTML = `Duração: ${data.runtime} mins. ${runtime_quote}`

  last_section.append(
    more_info_header,
    more_info_title,
    more_info_details,
    more_info_return,
  )
  container.append(last_section)

  //Autoscroll para o card criado
  last_section.scrollIntoView({ behavior: "smooth", block: "end" })
}
