const url = "http://localhost:8080"
//const url = "";

const calendarStartHour = 8;
const calendarEndHour = 22;
const standardShiftDuration = 4;
const calendar = document.querySelector(".calendar");
const header = document.querySelector(".calendar-header");
const today = new Date();
const calendarStartDate = new Date();
const calendarEndDate = new Date(today.setDate(today.getDate() + 6));
let editing = false;
const shiftInfoBox = document.querySelector(".shift-info");

const saveShift = async (shift) => {
    try {
        const response = await fetch(`${url}/api/shifts`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(shift),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (error) {
        console.error("Failed to save shift:", error);
    }
};

const updateShift = async (shift) => {
    try {
        const response = await fetch(`${url}/api/shifts/${shift.id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(shift),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    } catch (error) {
        console.error("Failed to update shift:", error);
    }
};

const updateEmployeeTable = async () => {
    toggleLoader(true);
    try {
        const calendarEmployeeId = document.getElementById("calendarEmployeeId").value;
        const urlPath = calendarEmployeeId ? `/api/shifts/employee/${calendarEmployeeId}/range` : "/api/shifts/range";
        const start = calendarStartDate.toISOString().split("T")[0];
        const end = calendarEndDate.toISOString().split("T")[0];

        const response = await fetch(`${url}${urlPath}?startDate=${start}&endDate=${end}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const shifts = await response.json();
        renderCalendarItemList(
            shifts.map(({id, employee, date, startTime, endTime}) => ({
                id,
                entityId: employee.id,
                title: employee.name + " " + employee.role,
                date,
                startTime,
                endTime,
            }))
        );
    } catch (error) {
        console.error("Failed to fetch shifts:", error);
    } finally {
        toggleLoader(false);
    }
};

document.addEventListener("DOMContentLoaded", updateEmployeeTable);

document.getElementById("calendarEmployeeId").addEventListener("change", async () => {
    updateEmployeeTable().catch(console.error);
});

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
        const response = await fetch(`${url}/api/employees`);
        if (!response.ok) throw new Error("Failed to fetch employees");

        const employees = await response.json();
        const shiftFormSelect = document.getElementById("employeeId");
        const calendarEmployeeSelect = document.getElementById("calendarEmployeeId");
        employees.forEach(({id, name}) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = name;
            shiftFormSelect.appendChild(option);
            calendarEmployeeSelect.appendChild(option.cloneNode(true));
        });
    } catch (error) {
        console.error("Failed to load employees:", error);
    }
};

fillOutSelect().catch(console.error);

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
function openShiftEditForm(shift) {
    editing = true;

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
    updateEmployeeTable().catch(console.error);
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
            updateEmployeeTable().catch(console.error);
        });
    } else {
        saveShift(shift).then(() => {
            updateEmployeeTable().catch(console.error);
        });
    }
    closeShiftEditForm();
});

// Cancel the shift creation or editing
document.getElementById("cancel-shift").addEventListener("click", function () {
    closeShiftEditForm();
});

function loadCalendar() {
    generateDayHeaders(calendarStartDate, calendarEndDate);
    generateTimeLabels(calendarStartHour, calendarEndHour);
    createDaysInRange(calendarStartDate, calendarEndDate);
    updateEmployeeTable().catch(console.error);
}

document.addEventListener("DOMContentLoaded", () => {
    loadCalendar();
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