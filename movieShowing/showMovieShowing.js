async function fetchMovieShowings(movieId) {
    try {
        const response = await fetch(`http://localhost:8080/api/movieShowingList/${movieId}`);
        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();

        const formattedData = data.map(showing => {
            const showDate = showing.showDate;
            const startTime = showing.startTime;
            const endTime = calculateEndTime(startTime, showing.movie.duration);
            return {
                movieHall: showing.movieHall.id,
                date: showDate,
                startTime: startTime,
                endTime: endTime,
                movieId: movieId,
                showingId: showing.id
            };
        });

        return formattedData;
    } catch (error) {
        console.error("Error fetching movie showings:", error);
        return [];
    }
}

function getWeekRange(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday: formatDateToISO(monday), sunday: formatDateToISO(sunday) };
}

async function displayMovies(movieId, movieTitle) {
    const movieShowings = await fetchMovieShowings(movieId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);




    const container = document.getElementById('movieSchedule');
    clearContainer(container);

    const titleElement = document.createElement('h2');
    titleElement.textContent = movieTitle;
    container.appendChild(titleElement);

    const groupedByDate = groupMovieShowingsByDate(movieShowings, today, today);
    const danishDaysOfWeek = [ "Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() + i);

        const dayStr = formatDateToISO(dayDate);
        const dayDiv = createDayContainer(danishDaysOfWeek[(today.getDay() + i) % 7], dayStr);

        if (groupedByDate[dayStr]) {
            const sortedMovies = sortMoviesByStartTime(groupedByDate[dayStr]);
            sortedMovies.forEach(movie => {
                const movieDiv = createMovieShowingDiv(movie);
                dayDiv.appendChild(movieDiv);
            });
        } else {
            const noMovies = createNoMoviesMessage();
            dayDiv.appendChild(noMovies);
        }

        container.appendChild(dayDiv);
    }
}




function clearContainer(container) {
    container.innerHTML = "";
}

function groupMovieShowingsByDate(movieShowings, monday, sunday) {
    const groupedByDate = {};
    movieShowings.forEach(showing => {
        if (showing.date >= monday && showing.date <= sunday) {
            if (!groupedByDate[showing.date]) {
                groupedByDate[showing.date] = [];
            }
            groupedByDate[showing.date].push(showing);
        }
    });
    return groupedByDate;
}



function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeDateToLocal(date) {
    date.setHours(0, 0, 0, 0);
    return date;
}



function createDayContainer(day, dayStr) {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add("day-container");

    const header = document.createElement('h3');
    header.textContent = `${day} (${dayStr})`;
    dayDiv.appendChild(header);

    return dayDiv;
}

function sortMoviesByStartTime(movies) {
    return movies.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function createMovieShowingDiv(movie) {
    const movieDiv = document.createElement('div');
    movieDiv.classList.add("movie-showing");
    movieDiv.textContent = `Hall ${movie.movieHall} (${movie.startTime} - ${movie.endTime})`;

    const link = document.createElement("a")
    link.href="./booking.html"

    link.addEventListener("click", () => {
        sessionStorage.setItem('movieHallId', movie.movieHall)
        sessionStorage.setItem('showingId', movie.showingId )
        sessionStorage.setItem('movieId', movie.movieId)
    })

    link.appendChild(movieDiv)

    return link;
}


function createNoMoviesMessage() {
    const noMovies = document.createElement('p');
    noMovies.textContent = "Ingen film for idag";
    return noMovies;
}

function calculateEndTime(startTime, length) {
    const [hours, minutes] = startTime.split(":").map(Number);
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0);
    endTime.setMinutes(endTime.getMinutes() + length);

    return endTime.toISOString().split("T")[1].substring(0, 5);
}

document.addEventListener("DOMContentLoaded", () => {
    const movieId = sessionStorage.getItem('movieId');
    const movieTitle = sessionStorage.getItem('movieTitle')
    if (movieId) {
        displayMovies(movieId, movieTitle);
    } else {
        console.error("Movie ID not found in sessionStorage.");
    }
});

