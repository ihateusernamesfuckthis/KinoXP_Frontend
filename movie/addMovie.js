const URL = "https://kinoxpbackend-fvaccreadvb9exd8.northeurope-01.azurewebsites.net"

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('opretFilmBtn').addEventListener('click', async function () {
        const filmData = {
            name: document.getElementById('filmTitel').value,
            description: document.getElementById('filmBeskrivelse').value,
            duration: parseInt(document.getElementById('filmVarighed').value),
            genre: document.getElementById('filmGenre').value,
            ageLimit: parseInt(document.getElementById('filmAldersgrænse').value),
            director: document.getElementById('filmInstruktør').value,
            pictureUrl: document.getElementById('filmBillede').value
        };

        if (!filmData.name || !filmData.description || !filmData.duration || !filmData.genre || !filmData.ageLimit || !filmData.director || !filmData.pictureUrl) {
            alert('Udfyld venligst alle felter');
            return;
        }

        try {
            const response = await fetch(`${URL}/api/movie/addmovie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filmData)
            });

            if (response.ok) {

            } else {
                alert('Fejl ved oprettelse af film');
            }
        } catch (error) {
            console.error('Fejl:', error);
            alert('Der opstod en fejl');
        }
    });
});