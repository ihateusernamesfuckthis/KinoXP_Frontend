const url = "http://localhost:8080"
//const url = "";

const calendarStartHour = 8;
const calendarEndHour = 22;
const standardShiftDuration = 3;
const extraTimePrMovieShowing = 30; // Time in minutes
const calendar = document.querySelector(".calendar");
const header = document.querySelector(".calendar-header");
const today = new Date();
const calendarStartDate = new Date();
const calendarEndDate = new Date(today.setDate(today.getDate() + 6));
let editing = false;
const movieShowingInfoBox = document.querySelector(".movie-showing-info");

const saveMovieShowing = async (movieShowing) => {
    try {
        const response = await fetch(`${url}/api/movieShowingList`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(movieShowing),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (error) {
        console.error("Failed to save movie showing:", error);
    }
};

const updateMovieShowing = async (movieShowing) => {
    try {
        const response = await fetch(`${url}/api/movieShowingList/${movieShowing.id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(movieShowing),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (error) {
        console.error("Failed to update movie showing:", error);
    }
};

const updateCalendarWithMovieShowing = async () => {
    toggleLoader(true);
    try {
        const urlPath = "/api/movieShowingList/range";
        const start = calendarStartDate.toISOString().split("T")[0];
        const end = calendarEndDate.toISOString().split("T")[0];

        const response = await fetch(`${url}${urlPath}?startDate=${start}&endDate=${end}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const movieShowings = await response.json();
        renderCalendarItemList(
            movieShowings.map(({id, movie, movieHall, seats, showDate, startTime}) => ({
                id,
                entityId: movie.id,
                entity: {movie, movieHall},
                title: `${movie.name} ${movie.genre} ${movie.ageLimit}+ Hall: ${movieHall.id}`,
                date: showDate,
                startTime,
                endTime: new Date(
                    new Date(showDate + " " + startTime).getTime() +
                    movie.duration * 60000 +
                    extraTimePrMovieShowing * 60000
                ).toLocaleTimeString("en-GB", {hour12: false, hour: "2-digit", minute: "2-digit"}),
            }))
        );
    } catch (error) {
        console.error("Failed to fetch shifts:", error);
    } finally {
        toggleLoader(false);
    }
};

const getEntityColor = (id) => ["#B4E1D1", "#F1D0A9", "#D1C6E1", "#A3D3C1", "#F5B8B8", "#C6E3F6", "#E6D1B3", "#D1F2F1", "#F1D7E0", "#D3E6E3"][id % 10];

const toggleLoader = (show) => {
    const loader = document.querySelector(".loader-container");
    if (show && !loader) {
        const container = document.createElement("div");
        container.classList.add("loader-container");
        container.innerHTML = `<div class="loader"></div>`;
        calendar.appendChild(container);
    } else if (!show && loader) {
        loader.remove();
    }
};

const generateDayHeaders = (startDate, endDate) => {
    header.innerHTML = "";
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayHeader = document.createElement("div");
        dayHeader.textContent = d.toLocaleDateString("da-DK", {
            weekday: "long",
            month: "numeric",
            day: "numeric",
            year: "numeric"
        }).replace(/^\w/, (c) => c.toUpperCase());

        dayHeader.classList.add("header-item");
        header.appendChild(dayHeader);
    }
};

const generateTimeLabels = () => {
    const container = document.querySelector(".time-labels");
    container.innerHTML = "";
    for (let h = calendarStartHour; h < calendarEndHour; h++) {
        const label = document.createElement("div");
        label.classList.add("time-label");
        label.textContent = `${h}:00`;
        label.style.height = `calc(100% / ${calendarEndHour - calendarStartHour})`;
        container.appendChild(label);
    }
};

const createDaysInRange = (startDate, endDate) => {
    calendar.innerHTML = "";
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const day = document.createElement("div");
        day.classList.add("day");
        day.dataset.date = d.toISOString().split("T")[0];
        day.addEventListener("click", (e) => !editing && addCalendarItem(e));
        calendar.appendChild(day);
    }
};

const fillOutSelect = async () => {
    try {
        const movieResponse = await fetch(`${url}/api/movie`);
        if (!movieResponse.ok) throw new Error("Failed to fetch movies");

        const movies = await movieResponse.json();
        const movieFormSelect = document.getElementById("movieId");
        movies.forEach(({id, name, duration}) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = name;
            option.dataset.timeDuration = duration;
            movieFormSelect.appendChild(option);
        });

        const movieHallResponse = await fetch(`${url}/api/movie-hall`);
        if (!movieHallResponse.ok) throw new Error("Failed to fetch movie halls");

        const movieHalls = await movieHallResponse.json();
        const movieHallFormSelect = document.getElementById("movieHallId");
        movieHalls.forEach(({id}) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = "Sal " + id;
            movieHallFormSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load movies or movie hal:", error);
    }
};

function addCalendarItem(event) {
    const calendarItem = createDefaultCalenderItem(event);

    renderCalendarItem(calendarItem);
    openMovieShowingEditForm(calendarItem); // Open editing form for the newly added shift
}

function createDefaultCalenderItem(event) {
    // Hour and minute depending on the Y position on the day column
    const startTimeDecimal = (event.offsetY / event.target.clientHeight) * (calendarEndHour - calendarStartHour) + calendarStartHour;
    const initialStartHour = Math.floor(startTimeDecimal);
    const initialStartMinutes = startTimeDecimal % 1 * 60;

    // Rounds the minutes to closest 0, 30 or 60 minutes and adds 1 to hours if 60.
    const roundedMinutes = Math.round(initialStartMinutes / 30) * 30;
    const startMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    const startHour = initialStartHour + (roundedMinutes === 60 ? 1 : 0);

    // Calculate end Y position based of start time
    // Makes sure the shift doesn't go over the end of the workday
    const totalStartWorkMinutes = startMinutes + (startHour * 60); // How many minutes since 00:00
    const endHour = totalStartWorkMinutes + (standardShiftDuration * 60) >= (calendarEndHour * 60) ? calendarEndHour - 1 : startHour + standardShiftDuration;
    const endMinutes = totalStartWorkMinutes + (standardShiftDuration * 60) >= (calendarEndHour * 60) ? 59 : startMinutes;

    const startTime = `${startHour < 10 ? "0" + startHour : startHour}:${startMinutes < 10 ? "0" + startMinutes : startMinutes}`; // Format as a string in the format HH:MM
    const endTime = `${endHour < 10 ? "0" + endHour : endHour}:${endMinutes < 10 ? "0" + endMinutes : endMinutes}`; // Format as a string in the format HH:MM

    return {
        id: undefined,
        entityId: undefined,
        entity: undefined,
        title: "Ny film visning",
        date: event.target.dataset.date,
        startTime: startTime,
        endTime: endTime,
    };
}

function calculateCalendarItemPositionAndHeight(calendarItem, calendarDayHeight) {
    const totalMinutesInWorkday = (calendarEndHour - calendarStartHour) * 60;

    const [startHour, startMinutes] = calendarItem.startTime.split(":").map(Number);
    const [endHour, endMinutes] = calendarItem.endTime.split(":").map(Number);
    // Calculate start Y position based of start time. Using ratio of the start time to the total minutes in workday
    const workStartTimeMinutes = startMinutes + (startHour * 60) - (calendarStartHour * 60); // How many minutes since start of workday
    const startRatio = workStartTimeMinutes / totalMinutesInWorkday;
    const startY = startRatio * calendarDayHeight;

    const endTimeInMinutes = endHour * 60 + endMinutes;
    const startTimeInMinutes = startHour * 60 + startMinutes;
    const endRatio = (endTimeInMinutes - startTimeInMinutes) / totalMinutesInWorkday;
    const endY = endRatio * calendarDayHeight + startY > calendarDayHeight ? calendarDayHeight : endRatio * calendarDayHeight + startY;

    return {
        startY: startY,
        height: endY - startY
    };
}

function renderCalendarItem(calendarItem) {
    const calendarDayElement = calendar.querySelector(`[data-date="${calendarItem.date}"]`);
    if (!calendarDayElement) {
        return;
    }

    const positionAndHeight = calculateCalendarItemPositionAndHeight(calendarItem, calendarDayElement.clientHeight);

    calendarItem.startY = positionAndHeight.startY;
    calendarItem.height = positionAndHeight.height;

    const calendarItemElement = document.querySelector(`[data-id="${calendarItem.id}"]`) || document.createElement("div");

    calendarItemElement.classList.add("calendarItem");
    // Cut off seconds from time
    calendarItemElement.textContent = calendarItem.title + " " + calendarItem.startTime.substring(0, 5) + " - " + calendarItem.endTime.substring(0, 5);
    calendarItemElement.dataset.id = calendarItem.id + "";
    calendarItemElement.dataset.entityId = calendarItem.entityId + "";
    calendarItemElement.style.top = `${calendarItem.startY}px`;
    calendarItemElement.style.height = `${calendarItem.height}px`;
    calendarItemElement.style.setProperty('--entity-color', getEntityColor(calendarItem.entityId ? calendarItem.entityId : 0));

    calendarItemElement.addEventListener('click', function (event) {
        openMovieShowingEditForm(calendarItem);
    });

    calendarDayElement.appendChild(calendarItemElement);

    updateCalendarItemWidth(calendarDayElement);
}

function updateCalendarItemWidth(calendarDayElement) {
    const calendarItems = Array.from(calendarDayElement.querySelectorAll(".calendarItem"));

    // Sort by start time
    calendarItems.sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

    // Simply assign each calendarItem.dataset.id to a separate column
    const columns = {};

    calendarItems.forEach(item => {
        const itemId = item.dataset.entityId;
        if (!columns[itemId]) {
            columns[itemId] = [];
        }
        columns[itemId].push(item);
    });
    // Set the width and left position for each column
    Object.keys(columns).forEach((key, index) => {
        const columnWidth = 100 / Object.keys(columns).length;
        columns[key].forEach(item => {
            item.style.width = `calc(${columnWidth}% - 6px)`;
            item.style.left = `calc(${index * columnWidth}% + 3px)`;
        });
    });
}


function renderCalendarItemList(calendarItemList) {
    // Clear days
    const calendarDayList = calendar.querySelectorAll(".day");
    calendarDayList.forEach((day) => {
        day.innerHTML = "";
    })
    calendarItemList.forEach(calendarItem => {
        renderCalendarItem(calendarItem);
    });
}

// Open the shift info form to edit the shift
function openMovieShowingEditForm(calendarItem) {
    editing = true;

    const calendarDayElements = Array.from(calendar.querySelectorAll(".day"));
    const index = calendarDayElements.findIndex(element => element.dataset.date === calendarItem.date);
    const calendarDayElement = calendarDayElements[index];

    // Show form before getting data to have correct width and height
    movieShowingInfoBox.style.display = "block";

    const bounding = calendarDayElement.getBoundingClientRect();
    const shiftInfoBoxWidth = movieShowingInfoBox.offsetWidth;
    const leftPositionInfobox = bounding.right;
    if (leftPositionInfobox + shiftInfoBoxWidth > window.innerWidth || bounding.left > window.innerWidth - bounding.right) {
        // If the form is too wide or there is more space on the left, move it to the left
        movieShowingInfoBox.style.left = `${bounding.left - shiftInfoBoxWidth}px`;
    } else {
        // If the form is not too wide, move it to the right
        movieShowingInfoBox.style.left = `${leftPositionInfobox}px`;
    }

    if (calendarItem.entity?.movie?.id) {
        document.getElementById("movieId").value = calendarItem.entity.movie.id;
    }
    if (calendarItem.entity?.movieHall?.id) {
        document.getElementById("movieHallId").value = calendarItem.entity.movieHall.id;
    }
    if (calendarItem.id) {
        document.getElementById("movieShowingId").value = calendarItem.id;
        document.querySelector(".movie-showing-info h3").textContent = "Rediger vilm visning";
    } else {
        document.querySelector(".movie-showing-info h3").textContent = "Opret film visning";
    }
    document.getElementById("date").value = calendarItem.date;
    document.getElementById("startTime").value = calendarItem.startTime;
    document.getElementById("endTime").value = calendarItem.endTime;

}

function closeShiftEditForm() {
    movieShowingInfoBox.style.display = "none";
    editing = false;
    document.getElementById("movieShowingForm").reset();
    document.getElementById("error-message").style.display = "none";
    updateCalendarWithMovieShowing().catch(console.error);
}

function isTimeRangeValid(startHour, endHour, startMinutes, endMinutes) {
    if (endHour > calendarEndHour || (endHour === calendarEndHour && endMinutes > 0)) {
        return {
            valid: false,
            errorMessage: "Film er for lang til at starte ved denne tid, da biografen lukker ved " + calendarEndHour + ":00"
        };
    } else if (startHour < calendarStartHour || (startHour === calendarStartHour && startMinutes < 0)) {
        return {valid: false, errorMessage: "Film starter før åbningstiden på " + calendarStartHour + ":00"};
    } else if (startHour > endHour || (startHour === endHour && startMinutes > endMinutes)) {
        return {valid: false, errorMessage: "Film starter efter den planlagte slut tid"};
    }

    return {valid: true};
}

// Save the shift after editing
document.getElementById("movieShowingForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const movieShowingId = document.getElementById("movieShowingId").value;
    const movieId = document.getElementById("movieId").value;
    const movieHallId = document.getElementById("movieHallId").value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const [startHour, startMinutes] = startTime.split(":").map(Number);
    const [endHour, endMinutes] = endTime.split(":").map(Number);

    const isValid = isTimeRangeValid(startHour, endHour, startMinutes, endMinutes);
    if (!isValid.valid) {
        const errorMessageBox = document.getElementById("error-message");
        errorMessageBox.style.display = "block";
        errorMessageBox.textContent = isValid.errorMessage;
        return;
    }

    const movieShowing = {
        movieId,
        movieHallId,
        showDate: date,
        startTime
    };
    if (movieShowingId) {
        movieShowing.id = movieShowingId;
        updateMovieShowing(movieShowing).then(() => {
            updateCalendarWithMovieShowing().catch(console.error);
        });
    } else {
        saveMovieShowing(movieShowing).then(() => {
            updateCalendarWithMovieShowing().catch(console.error);
        });
    }
    closeShiftEditForm();
});

// Cancel the shift creation or editing
document.getElementById("cancel-shift").addEventListener("click", function () {
    closeShiftEditForm();
});

document.querySelectorAll("#movieId, #startTime").forEach(element => {
    element.addEventListener("change", function () {
        const startTimeValue = document.getElementById("startTime").value;
        if (startTimeValue) {
            const [startHour, startMinutes] = startTimeValue.split(":").map(Number);
            const movieId = document.getElementById("movieId").value;
            const movieOption = document.querySelector(`#movieId > option[value="${movieId}"]`);
            const movieDurationMinutes = parseInt(movieOption.dataset.timeDuration);
            let endHour = startHour + Math.floor(movieDurationMinutes / 60);
            let endMinutes = startMinutes + extraTimePrMovieShowing + (movieDurationMinutes % 60);

            if (endMinutes >= 60) {
                endMinutes -= 60;
                endHour += 1;
            }

            const isValid = isTimeRangeValid(startHour, endHour, startMinutes, endMinutes);
            const errorMessageBox = document.getElementById("error-message");
            if (!isValid.valid) {
                errorMessageBox.style.display = "block";
                errorMessageBox.textContent = isValid.errorMessage;
            } else {
                errorMessageBox.style.display = "none";
            }

            const formattedEndTime = `${endHour < 10 ? "0" + endHour : endHour}:${endMinutes < 10 ? "0" + endMinutes : endMinutes}`;
            document.getElementById("endTime").value = formattedEndTime;
        }
    });
})

function loadCalendar() {
    generateDayHeaders(calendarStartDate, calendarEndDate);
    generateTimeLabels(calendarStartHour, calendarEndHour);
    createDaysInRange(calendarStartDate, calendarEndDate);
    updateCalendarWithMovieShowing().catch(console.error);
}

document.addEventListener("DOMContentLoaded", () => {
    loadCalendar();
    fillOutSelect().catch(console.error);
});

document.getElementById("prev-week").addEventListener("click", function () {
    calendarStartDate.setDate(calendarStartDate.getDate() - 7);
    calendarEndDate.setDate(calendarEndDate.getDate() - 7);
    loadCalendar();
});

document.getElementById("next-week").addEventListener("click", function () {
    calendarStartDate.setDate(calendarStartDate.getDate() + 7);
    calendarEndDate.setDate(calendarEndDate.getDate() + 7);
    loadCalendar();
});

