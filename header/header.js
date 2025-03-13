document.addEventListener("DOMContentLoaded", function () {
    fetch('/header/header.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
        });
});