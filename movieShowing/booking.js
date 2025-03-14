const movieHallId = sessionStorage.getItem('movieHallId');
const showingId = sessionStorage.getItem('showingId');

let maxTickets = 0;
let selectedSeats = [];

function getBookedSeats(showingId) {
    fetch(`http://localhost:8080/api/booking/${showingId}`)
        .then(response => response.json())
        .then(bookedSeats => {
            getLayoutSize(movieHallId, bookedSeats);
        })
        .catch(error => {
            console.error('Error fetching booked seats:', error);
        });
}

function getLayoutSize(movieHallId, bookedSeats) {
    let rowLength;
    let seatLength;

    if (movieHallId === '1') {
        rowLength = 12;
        seatLength = 20;
    } else if (movieHallId === '2') {
        rowLength = 16;
        seatLength = 25;
    }

    if (rowLength !== undefined && seatLength !== undefined) {
        createSeatLayout(rowLength, seatLength, bookedSeats);
        createTicketSelection(rowLength, seatLength);
    }
}

function createSeatLayout(rowLength, seatLength, bookedSeats) {
    const container = document.createElement('div');
    container.classList.add('seat-container');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${seatLength}, 30px)`;
    document.body.appendChild(container);

    for (let row = 0; row < rowLength; row++) {
        for (let col = 0; col < seatLength; col++) {
            const seatElement = document.createElement('div');
            seatElement.classList.add('seat');
            seatElement.dataset.row = row + 1;
            seatElement.dataset.col = col + 1;

            const seatData = bookedSeats.find(seat => seat.rowsNumber === row + 1 && seat.seatNumber === col + 1);

            if (seatData && seatData.booked) {
                seatElement.style.backgroundColor = '#ff4141';
                seatElement.style.pointerEvents = 'none';
            } else {
                seatElement.style.backgroundColor = '';
                seatElement.onclick = function () {
                    seatClicked(row + 1, col + 1, seatElement);
                };
            }

            container.appendChild(seatElement);
        }
    }
}

function createTicketSelection(rowLength, seatLength) {
    const ticketInput = document.createElement('input');
    ticketInput.type = 'number';
    ticketInput.min = 1;
    ticketInput.max = rowLength * seatLength;
    ticketInput.placeholder = 'Number of tickets';
    ticketInput.id = 'ticketInput';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm Tickets';
    confirmButton.onclick = function () {
        maxTickets = parseInt(ticketInput.value) || 0;
        selectedSeats = [];

        document.querySelectorAll('.seat').forEach(seat => {
            const isBooked = seat.style.pointerEvents === 'none';
            if (!isBooked) {
                seat.style.backgroundColor = "";
            }
        });

        updateBuyButton()
    };

    const buyButton = document.createElement('button');
    buyButton.textContent = 'Buy Ticket';
    buyButton.id = 'buyButton';
    buyButton.disabled = true;
    buyButton.onclick = function () {
        bookSeats(selectedSeats)
        document.querySelectorAll('.seat').forEach(seat => {
            const seatKey = `${seat.dataset.row}-${seat.dataset.col}`;
            if (selectedSeats.includes(seatKey)) {
                seat.style.backgroundColor = "#ff4141";
                seat.style.pointerEvents = 'none';
            }
        });

        updateBuyButton();
    };


    document.body.appendChild(ticketInput);
    document.body.appendChild(confirmButton);
    document.body.appendChild(buyButton);
}

function seatClicked(row, col, seat) {
    const seatKey = `${row}-${col}`;
    if (selectedSeats.includes(seatKey)) {
        selectedSeats = selectedSeats.filter(s => s !== seatKey);
        seat.style.backgroundColor = "";
    } else {
        if (selectedSeats.length < maxTickets) {
            selectedSeats.push(seatKey);
            seat.style.backgroundColor = "#50f887";
        } else {
            alert("You've already selected the maximum number of tickets!");
        }
    }

    updateBuyButton();
}

function updateBuyButton() {
    const buyButton = document.getElementById('buyButton');
    buyButton.disabled = !(selectedSeats.length === maxTickets && maxTickets > 0);

}


function bookSeats(selectedSeats) {
    const showingId = sessionStorage.getItem('showingId');

    if (!showingId) {
        console.error('Showing ID not found in sessionStorage');
        return;
    }


    fetch(`http://localhost:8080/api/booking/${showingId}`)
        .then(response => response.json())
        .then(bookedSeats => {
            bookedSeats.forEach(seat => {
                const seatKey = `${seat.rowsNumber}-${seat.seatNumber}`;
                if (selectedSeats.includes(seatKey)) {
                    return;
                }
            });
            console.log("Fetched seats: " + bookedSeats);
            const movieSeatObject = selectedSeats.map(seat => {
                return {
                    rowsNumber: seat.split("-")[0],
                    seatNumber: seat.split("-")[1],
                    isBooked: true
                }
            })

            fetch(`http://localhost:8080/api/booking/${showingId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(movieSeatObject)

        })
        .
            then(response => response.json())
                .then(updatedMovieShowing => {
                    console.log('MovieShowing updated successfully:', updatedMovieShowing);
                    alert('Tickets Purchased for: ' + JSON.stringify(selectedSeats));


                    document.querySelectorAll('.seat').forEach(seat => {
                        const seatKey = `${seat.dataset.row}-${seat.dataset.col}`;
                        if (selectedSeats.includes(seatKey)) {
                            seat.style.backgroundColor = "#ff4141";
                            seat.style.pointerEvents = 'none';
                        }
                    });

                    updateBuyButton();
                })
                .catch(error => {
                    console.error('Error updating movie showing:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching movie showing data:', error);
        });
}


getBookedSeats(showingId);


