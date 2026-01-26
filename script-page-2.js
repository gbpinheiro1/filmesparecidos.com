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
        4
      )})`
      recommendFilms(movie.title)
    })

  fetch(
    `https://api.themoviedb.org/3/movie/${filmId}/images?api_key=process.env.API_KEY&include_image_language=en-US`
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

function recommendFilms(film_name) {
  const info = new URLSearchParams(window.location.search)
  const filmId = info.get("movieId")
  const cards = document.querySelector(".cards")

  fetch(
    `https://api.themoviedb.org/3/movie/${filmId}/recommendations?page=1&language=pt-BR&api_key=process.env.API_KEY
  )
    .then((response) => response.json())
    .then((movies) => {
      // Evitar recomendações de filmes de uma mesma franquia
      for (let i = 0; i < movies.results.length; i++) {
        if (
          !movies.results[i].title
            .toLowerCase()
            .includes(film_name.toLowerCase()) &&
          cards.children.length < 4
        ) {
          const card = document.createElement("div")
          card.classList.add("card")
          const title = document.createElement("p")
          const title_wrapper = document.createElement("div")
          title_wrapper.classList.add("title_wrapper")
          const card_bottom = document.createElement("span")
          const bottom_text = document.createElement("small")
          const button = document.createElement("button")

          title.innerHTML = `${movies.results[i].title} (${movies.results[
            i
          ].release_date.slice(0, 4)})`

          // ajustar para título completo on hover
          title.title = `${movies.results[i].title} (${movies.results[
            i
          ].release_date.slice(0, 4)})`

          bottom_text.innerHTML = "Pedir mais informações ao Randy"

          card_bottom.append(bottom_text, button)
          title_wrapper.append(title)
          card.appendChild(title_wrapper)

          const poster = document.createElement("img")
          const poster_wrapper = document.createElement("div")
          poster_wrapper.classList.add("poster_wrapper")
          fetch(
            `https://api.themoviedb.org/3/movie/${movies.results[i].id}/images?api_key=process.env.API_KEY&include_image_language=en-US`
          )
            .then((response) => response.json())
            .then((movie) => {
              var cont = 0
              for (let j = 0; j < movie.posters.length; j++) {
                if (movie.posters.length > 0 && cont < 1) {
                  poster.src = `https://image.tmdb.org/t/p/w300/${movie.posters[j].file_path}`
                  cont++
                } else if (movie.backdrops.length > 0 && cont < 1) {
                  poster.src = `https://image.tmdb.org/t/p/w300/${movie.backdrops[j].file_path}`
                  cont++
                }
              }
            })
          poster_wrapper.append(poster)
          card.appendChild(poster_wrapper)
          card.appendChild(card_bottom)
          cards.appendChild(card)
        }
      }
    })
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
