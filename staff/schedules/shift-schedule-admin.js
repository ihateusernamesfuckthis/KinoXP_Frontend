const calendarStartHour = 8;
const calendarEndHour = 22;
const standardShiftDuration = 7; // Default shift duration in hours
const calendar = document.querySelector(".calendar");
const timeLabels = document.querySelector(".time-labels");
const shiftInfoBox = document.querySelector(".shift-info");
let editing = false;
const calendarItemList = [];

// Generate time labels
for (let h = calendarStartHour; h < calendarEndHour; h++) {
    const label = document.createElement("div");
    label.classList.add("time-label");
    label.textContent = `${h}:00`;
    label.style.height = `calc(100% / ${calendarEndHour - calendarStartHour})`;
    timeLabels.appendChild(label);
}

// Create 7 day columns
for (let i = 0; i < 7; i++) {
    const dayElement = document.createElement("div");
    dayElement.classList.add("day");
    const today = new Date();
    today.setDate(today.getDate() + i); // Increment the day based on the loop index
    dayElement.dataset.date = today.toISOString().split('T')[0]; // Set the date in YYYY-MM-DD format
    dayElement.addEventListener('click', function (event) {
        if (!editing) {
            addCalendarItem(dayElement, event);
        }
    });
    calendar.appendChild(dayElement);
}

function saveShift(shift) {
    fetch(`http://localhost:8080/api/shifts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(shift)
    });
}

async function updateEmployeeTable() {
    let loader = document.querySelector(".loader-container");
    if (!loader) {
        const loaderContainer = document.createElement("div");
        loaderContainer.classList.add("loader-container");

        const loader = document.createElement("div");
        loader.classList.add("loader");

        loaderContainer.appendChild(loader);
        document.body.appendChild(loaderContainer);
    }

    try {
        const response = await fetch("http://localhost:8080/api/shifts");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const shifts = await response.json();
        calendarItemList.length = 0; // Clear existing data

        shifts.forEach(shift => {
            calendarItemList.push({
                id: shift.id,
                title: shift.employee.name,
                date: shift.date,
                startTime: shift.startTime,
                endTime: shift.endTime
            });
        });

        renderCalendarItemList();
    } catch (error) {
        console.error("Failed to fetch shifts:", error);
    } finally {
        document.querySelector(".loader-container").remove();
    }
}

document.addEventListener("DOMContentLoaded", updateEmployeeTable);

function fillOutSelect() {
    fetch("http://localhost:8080/api/employees")
        .then(response => response.json())
        .then(employees => {
            const select = document.getElementById("employeeId");
            employees.forEach(employee => {
                const option = document.createElement("option");
                option.value = employee.id;
                option.text = employee.name;
                select.appendChild(option);
            });
        });
}

fillOutSelect();

function addCalendarItem(dayElement, event) {
    const calendarItem = createDefaultCalenderItem(event);

    openShiftEditForm(calendarItem); // Open editing form for the newly added shift
    renderCalendarItem(calendarItem, dayElement);
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
        title: "Ny Vagt",
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

function renderCalendarItem(calendarItem, calendarDayElement) {
    const positionAndHeight = calculateCalendarItemPositionAndHeight(calendarItem, calendarDayElement.clientHeight);

    calendarItem.startY = positionAndHeight.startY;
    calendarItem.height = positionAndHeight.height;

    const calendarItemElement = document.createElement("div");
    calendarItemElement.classList.add("calendarItem");
    // Cut off seconds from time
    calendarItemElement.textContent = calendarItem.title + " " + calendarItem.startTime.substring(0, 5) + " - " + calendarItem.endTime.substring(0, 5);
    calendarItemElement.dataset.index = calendarItem.id + "";
    calendarItemElement.style.top = `${calendarItem.startY}px`;
    calendarItemElement.style.height = `${calendarItem.height}px`;

    calendarDayElement.appendChild(calendarItemElement);
}

function renderCalendarItemList() {
    // Clear days
    const calendarDayList = calendar.querySelectorAll(".day");
    calendarDayList.forEach((day) => {
        day.innerHTML = "";
    })
    calendarItemList.forEach(calendarItem => {
        // Rerender items
        const calendarDayElement = calendar.querySelector(`[data-date="${calendarItem.date}"]`);
        if (calendarDayElement) {
            renderCalendarItem(calendarItem, calendarDayElement);
        }
    });
}

// Open the shift info form to edit the shift
function openShiftEditForm(shift) {
    editing = true;
    document.getElementById("date").value = shift.date;
    document.getElementById("startTime").value = shift.startTime;
    document.getElementById("endTime").value = shift.endTime;
    shiftInfoBox.style.display = "block";
}

// Save the shift after editing
document.getElementById("shiftForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const employeeId = document.getElementById("employeeId").value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    const shift = {
        employeeId,
        date,
        startTime,
        endTime
    };
    saveShift(shift);
    this.reset();
    shiftInfoBox.style.display = "none";
    editing = false;
    renderCalendarItemList();
});

// Cancel the shift creation or editing
document.getElementById("cancel-shift").addEventListener("click", function () {
    shiftInfoBox.style.display = "none";
    editing = false;
    renderCalendarItemList();
});