const URL = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", function () {
    fetch(`${URL}/api/movie`)
        .then(response => response.json())
        .then(movies => displayMovies(movies))
        .catch(error => console.error("Error fetching movies:", error));
});

function displayMovies(movies) {
    const container = document.getElementById("movie-container");
    container.innerHTML = "";

    movies.forEach(movie => {
        const movieElement = document.createElement("div");
        movieElement.classList.add("movie-card");

        const imageUrl = `../..${movie.pictureUrl}`;

        console.log(movie.name)
        movieElement.innerHTML = `
            <img src="${imageUrl}" alt="${movie.name}" class="movie-image" onerror="this.onerror=null; this.src='/movieShowing/images/default.webp';">
            <div class="button-container">
                <h3>${movie.name}</h3>
                <button onclick="readMore(${movie.id})">Læs mere</button>
                <button onclick="bookMovie(${movie.id}, '${movie.name}')">Book</button>
            </div>
        `;

        container.appendChild(movieElement);
    });
}

function bookMovie(movieId, movieName) {
    sessionStorage.setItem('movieId', movieId);
    sessionStorage.setItem('movieTitle', movieName);
    console.log(movieName);
    window.location.href = 'showMovieShowing.html';
}

function readMore(movieId) {
    window.location.href = `${URL}/movieDetails/${movieId}`;
}