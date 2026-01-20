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

  fetch(`https://api.themoviedb.org/3/movie/${filmId}/images?api_key=process.env.API_KEY&include_image_language=en-US`)
    .then((response) => response.json())
    .then((movie) => {
      chosen_movie_poster.src = `https://image.tmdb.org/t/p/w300/${movie.posters[0].file_path}`
    })
}

function recommendFilms(film_name) {
  const info = new URLSearchParams(window.location.search)
  const filmId = info.get("movieId")

  fetch(
    `https://api.themoviedb.org/3/movie/${filmId}/recommendations?page=1&language=pt-BR&api_key=process.env.API_KEY
  )
    .then((response) => response.json())
    .then((movies) => {
      // Evitar recomendações de filmes de uma mesma franquia
      console.log(film_name)
      for (let i = 0; i < movies.results.length; i++) {
        if (
          !movies.results[i].title
            .slice(0, 5)
            .includes(`${film_name.slice(0, 5)}`)
        ) {
          console.log(movies.results[i].title)
        }
      }
    })
}
