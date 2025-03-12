
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


function getWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const diffToMonday = (dayOfWeek + 6) % 7;

    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Format dates to YYYY-MM-DD for comparison
    const mondayStr = monday.toISOString().split("T")[0];
    const sundayStr = sunday.toISOString().split("T")[0];

    return { monday: mondayStr, sunday: sundayStr };
}
async function displayMovies(movieId, movieTitle) {
    const movieShowings = await fetchMovieShowings(movieId);
    const { monday, sunday } = getWeekRange();
    const container = document.getElementById('movieSchedule');
    clearContainer(container);

    const titleElement = document.createElement('h2');
    titleElement.textContent = movieTitle;
    container.appendChild(titleElement);

    const groupedByDate = groupMovieShowingsByDate(movieShowings, monday, sunday);
    const daysOfWeek = getDaysOfWeek();

    daysOfWeek.forEach((day, index) => {
        const dayDate = getDayDate(index);
        const dayStr = formatDateToISO(dayDate);
        const dayDiv = createDayContainer(day, dayStr);

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
    });
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

function getDaysOfWeek() {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
}

function getDayDate(index) {
    const dayDate = new Date();
    dayDate.setDate(new Date().getDate() - new Date().getDay() + index);
    return dayDate;
}

function formatDateToISO(date) {
    return date.toISOString().split("T")[0];
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
    noMovies.textContent = "No movies scheduled";
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
    const movieId = 1; // Replace with the actual movie ID you want to fetch showings for
    const movieTitle = "Movie Title"; // Replace with the actual movie title
    displayMovies(movieId, movieTitle);
});

