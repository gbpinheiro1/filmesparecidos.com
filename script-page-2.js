chosenMovie()
function chosenMovie() {
  const info = new URLSearchParams(window.location.search)
  const filmId = info.get("movieId")
  var chosen_movie_name = document.querySelector("#chosen_movie_name")
  var chosen_movie_poster = document.querySelector("#chosen_movie_poster")

  fetch(
    `https://api.themoviedb.org/3/movie/${filmId}?language=pt-BR&api_key=process.env.API_KEY
  )
    .then((response) => response.json())
    .then((movie) => {
      chosen_movie_name.innerHTML = `${movie.title} (${movie.release_date.slice(
        0,
        4,
      )})`
      recommendFilms(movie.title)
    })

  fetch(
    `https://api.themoviedb.org/3/movie/${filmId}/images?api_key=process.env.API_KEY&include_image_language=en-US`,
  )
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
  await fetch(
    `https://api.themoviedb.org/3/movie/${filmId}?language=pt-BR&api_key=process.env.API_KEY
  )
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
  var pageNumber = 1
  filmsResults = await recommendedMovies(
    filmId,
    movieYear,
    movieGenres,
    chosenMovieName,
    pageNumber,
    filmsResults,
  )
  // camada 2
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
  //camada 3, usar keywords
  if (filmsResults.length < 4) {
    var movieKeywords = []
    await fetch(
      `https://api.themoviedb.org/3/movie/${filmId}/keywords?api_key=process.env.API_KEY
    )
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
    )
  }
  // usar apenas 1 keyword
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

  for (let i = 0; i < filmsResults.length; i++) {
    if (cards.children.length >= 4) break

    const card = document.createElement("div")
    card.classList.add("card")
    const title = document.createElement("p")
    const title_wrapper = document.createElement("div")
    title_wrapper.classList.add("title_wrapper")

    const card_bottom = document.createElement("span")

    //card de more info
    const last_section = document.querySelector("#more_info")
    var movie_more_info = ""
    card_bottom.addEventListener("click", async () => {
      movie_more_info = await moreInfo(filmsResults[i].id)
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
      `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=pt-BR&page=1&api_key=process.env.API_KEY&with_keywords=${movieKeywords[i]}`,
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
    `https://api.themoviedb.org/3/movie/${filmId}/recommendations?page=${pageNumber}&language=pt-BR&api_key=process.env.API_KEY
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
      commonGenres >= 2 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
      console.log(`recommended e página ${pageNumber}`)
    }
    //Evitar que o algoritmo da TMDB recomende filmes por simples semelhança de ano de lançamento (comportamento de filmes recentes)
    else if (
      movieYear > currentYear - 12 &&
      Math.abs(movieYear - Number(data.results[i].release_date.slice(0, 4))) >
        1 &&
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
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${filmId}/similar?language=pt-BR&page=1&api_key=process.env.API_KEY
  )
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
      console.log("similar")
    }

    if (
      movieYear > currentYear - 12 &&
      Math.abs(movieYear - Number(data.results[i].release_date.slice(0, 4))) >
        0 &&
      commonGenres >= 2 &&
      validate(data.results[i], chosenMovieName, filmsResults) === true
    ) {
      filmsResults.push(data.results[i])
      console.log("similar")
    }
  }
  return filmsResults
}

async function discoverMovies(params, filmsResults, chosenMovieName) {
  const url = `https://api.themoviedb.org/3/discover/movie?include_adult=false
&include_video=false
&vote_count.gte=45&sort_by=vote_count.desc&language=pt-BR&page=1&api_key=process.env.API_KEY
  const res = await fetch(url)
  const data = await res.json()
  for (let i = 0; i < data.results.length; i++) {
    if (filmsResults.length >= 4) {
      break
    }
    if (validate(data.results[i], chosenMovieName, filmsResults) === true)
      filmsResults.push(data.results[i])
    console.log("discover")
  }
  return filmsResults
}

async function hasValidPoster(movieId) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=process.env.API_KEY&include_image_language=en-US`,
  )
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

async function moreInfo(movieId) {
  const res =
    await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US&api_key=process.env.API_KEY
  const data = await res.json()
  return data
}
