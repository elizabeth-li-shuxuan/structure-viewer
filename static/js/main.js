//4/3/2025 Elizabeth Li
//submit a user-inputted rating for a given file to the server

function submitRating(filename){
    const rating = document.getElementById('rating').value;

    fetch('/rate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({filename: filename, rating: rating})
    })

    .then(response => response.json())

    .then(data => {
        alert('Rating submitted successfully');
        console.log(data);
    });
}