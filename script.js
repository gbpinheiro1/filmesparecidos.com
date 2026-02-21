//Pegando o input de texto HTML e a <ul>
var filmInput = document.querySelector("#film_name")
var filmList = document.querySelector("#film_list")
filmInput.addEventListener("input", searchFilm)

function searchFilm() {
  var filmId = filmInput.value.trim().toLowerCase()
  if (filmId.length < 2) {
    filmList.innerHTML = ""
    return
  }
  filmList.innerHTML = ""

  fetch(
    `https://api.themoviedb.org/3/search/movie?include_adult=false&language=pt-BR&query=${filmId}&page=1&api_key=process.env.API_KEY
  )
    .then((response) => response.json())
    .then((data) => {
      let popularityRank = []
      let addedMovies = []
      for (let i = 0; i < data.results.length; i++) {
        if (
          !popularityRank.some(
            (popularity) => popularity == data.results[i].popularity,
          )
        ) {
          popularityRank.push(data.results[i].popularity)
        }
      }
      //ordenando o rank de relevância dos filmes
      popularityRank.sort((a, b) => a - b)
      popularityRank.reverse()
      //inserindo os 7 mais relevantes como recomendação
      //usando o rank de relevância para selecionar as recomendações da API que quero aparecendo nas <li>
      for (let i = 0; i < popularityRank.length; i++) {
        for (let j = 0; j < data.results.length; j++) {
          if (
            popularityRank[i] == data.results[j].popularity &&
            data.results[j].release_date.length > 0 &&
            filmList.children.length < 7 &&
            data.results[j].title.trim().toLowerCase().includes(filmId) &&
            !addedMovies.some((id) => id === data.results[j].id)
          ) {
            //evitar duplicatas na barra de pesquisa
            addedMovies.push(data.results[j].id)

            const listItem = document.createElement("li")

            const movie_title = document.createElement("span")
            movie_title.classList.add("movie_title")
            movie_title.textContent = data.results[j].title

            const release_date = document.createElement("span")
            release_date.classList.add("movie_release_date")
            release_date.textContent = `(${data.results[j].release_date.slice(
              0,
              4,
            )})`

            listItem.append(movie_title, release_date)
            listItem.addEventListener("click", () => {
              window.location.href = `page2.html?movieId=${data.results[j].id}`
            })
            filmList.appendChild(listItem)
          }
        }
      }
    })
    .catch((error) => console.error(error))
}
