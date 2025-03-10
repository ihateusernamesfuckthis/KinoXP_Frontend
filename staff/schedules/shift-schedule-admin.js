const calendarStartHour = 8;
const calendarEndHour = 22;
const standardShiftDuration = 4; // Default shift duration in hours
const calendar = document.querySelector(".calendar");
const shiftInfoBox = document.querySelector(".shift-info");
let editing = false;
const calendarItemList = [];
const header = document.querySelector(".calendar-header");
const today = new Date();
const options = {weekday: 'long', month: 'numeric', day: 'numeric', year: 'numeric'};

function getEntityColor(entityId) {
    const colors = [
        "#B4E1D1",  // Soft Mint
        "#F1D0A9",  // Pale Peach
        "#D1C6E1",  // Lavender Mist
        "#A3D3C1",  // Light Seafoam
        "#F5B8B8",  // Soft Rose
        "#C6E3F6",  // Powder Blue
        "#E6D1B3",  // Sandy Beige
        "#D1F2F1",  // Misty Aqua
        "#F1D7E0",  // Light Blush
        "#D3E6E3"   // Soft Teal
    ];
    return colors[entityId % colors.length]; //Make sure it loops colors
}

function showLoader() {
    let loader = document.querySelector(".loader-container");
    if (!loader) {
        const loaderContainer = document.createElement("div");
        loaderContainer.classList.add("loader-container");

        const loader = document.createElement("div");
        loader.classList.add("loader");

        loaderContainer.appendChild(loader);
        document.body.appendChild(loaderContainer);
    }
}

function hideLoader() {
    let loader = document.querySelector(".loader-container");
    if (loader) {
        loader.remove();
    }
}

// Generate headers for 7 days
for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayHeader = document.createElement("div");
    dayHeader.textContent = date.toLocaleDateString('da-DK', options).charAt(0).toUpperCase() + date.toLocaleDateString('da-DK', options).slice(1);
    dayHeader.classList.add("header-item");
    header.appendChild(dayHeader);
}


// Generate time labels
for (let h = calendarStartHour; h < calendarEndHour; h++) {
    const label = document.createElement("div");
    label.classList.add("time-label");
    label.textContent = `${h}:00`;
    label.style.height = `calc(100% / ${calendarEndHour - calendarStartHour})`;
    document.querySelector(".time-labels").appendChild(label);
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
            addCalendarItem(event);
        }
    });
    calendar.appendChild(dayElement);
}

async function saveShift(shift) {
    const response = await fetch(`http://localhost:8080/api/shifts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(shift)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
}

async function updateShift(shift) {
    const response = await fetch(`http://localhost:8080/api/shifts/${shift.id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(shift)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
}

async function updateEmployeeTable() {
    showLoader();
    try {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        const response = await fetch(`http://localhost:8080/api/shifts/range?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const shifts = await response.json();
        calendarItemList.length = 0; // Clear existing data

        shifts.forEach(shift => {
            calendarItemList.push({
                id: shift.id,
                entityId: shift.employee.id,
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
        hideLoader();
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

function addCalendarItem(event) {
    const calendarItem = createDefaultCalenderItem(event);

    renderCalendarItem(calendarItem);
    openShiftEditForm(calendarItem); // Open editing form for the newly added shift
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
        openShiftEditForm(calendarItem);
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


function renderCalendarItemList() {
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
function openShiftEditForm(shift) {
    const calendarDayElements = Array.from(calendar.querySelectorAll(".day"));
    const index = calendarDayElements.findIndex(element => element.dataset.date === shift.date);
    const calendarDayElement = calendarDayElements[index];

    // Show form before getting data to have correct width and height
    shiftInfoBox.style.display = "block";

    const bounding = calendarDayElement.getBoundingClientRect();
    const shiftInfoBoxWidth = shiftInfoBox.offsetWidth;
    const leftPositionInfobox = bounding.right;
    if (leftPositionInfobox + shiftInfoBoxWidth > window.innerWidth || bounding.left > window.innerWidth - bounding.right) {
        // If the form is too wide or there is more space on the left, move it to the left
        shiftInfoBox.style.left = `${bounding.left - shiftInfoBoxWidth}px`;
    } else {
        // If the form is not too wide, move it to the right
        shiftInfoBox.style.left = `${leftPositionInfobox}px`;
    }

    editing = true;
    if (shift.entityId) {
        document.getElementById("employeeId").value = shift.entityId;
    }
    if (shift.id) {
        document.getElementById("shiftId").value = shift.id;
        document.querySelector(".shift-info h3").textContent = "Rediger Vagt";
    } else {
        document.querySelector(".shift-info h3").textContent = "Opret vagt";
    }
    document.getElementById("date").value = shift.date;
    document.getElementById("startTime").value = shift.startTime;
    document.getElementById("endTime").value = shift.endTime;

}

function closeShiftEditForm() {
    shiftInfoBox.style.display = "none";
    editing = false;
    document.getElementById("shiftForm").reset();
    document.getElementById("error-message").style.display = "none";
    updateEmployeeTable();
}

// Save the shift after editing
document.getElementById("shiftForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const shiftId = document.getElementById("shiftId").value;
    const employeeId = document.getElementById("employeeId").value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    if (new Date(`${date}T${endTime}`).getTime() < new Date(`${date}T${startTime}`).getTime()) {
        const errorMessageBox = document.getElementById("error-message");
        errorMessageBox.style.display = "block";
        errorMessageBox.textContent = "Slut tidspunkt er tidligere end start tidspunktet. Indsendelse mislykkedes.";
        return;
    }

    const shift = {
        employeeId,
        date,
        startTime,
        endTime
    };
    if (shiftId) {
        shift.id = shiftId;
        updateShift(shift).then(() => {
            updateEmployeeTable();
        });
    } else {
        saveShift(shift).then(() => {
            updateEmployeeTable();
        });
    }
    closeShiftEditForm();
});

// Cancel the shift creation or editing
document.getElementById("cancel-shift").addEventListener("click", function () {
    closeShiftEditForm();
});