//const URL = 'http://localhost:8080/api/products';
const URL = 'https://kinoxpbackend-fvaccreadvb9exd8.northeurope-01.azurewebsites.net/api/products';
// const orderURL = "http://localhost:8080/api/orders";
const orderURL = "https://kinoxpbackend-fvaccreadvb9exd8.northeurope-01.azurewebsites.net/api/orders";

//midlertidige placeholder billeder til udvikling
const categoryImages = {
    "snacks": "images/snacks.png",
    "candy": "images/candy.png",
    "drinks": "images/soda.png",
    "chocolate": "images/chocolate.png",
    "placeholder": "images/placeholder.png"
};

let cart = [];

async function fetchProducts() {
    try {
        const response = await fetch(URL);


        console.log("Response status:", response.status); // Tjek HTTP-statuskode
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const products = await response.json();
        console.log("Fetched products:", products); // Debugging


        const productGrid = document.getElementById("product-grid");
        if (!productGrid) {
            console.error("Element with id 'product-grid' not found!");
            return;
        }

        productGrid.innerHTML = "";

        products.forEach(product => {
            const productCard = document.createElement("div");
            productCard.classList.add("productCard");
            productCard.id = `product-${product.id}`;

            // Konverter kategori til små bogstaver for at matche `categoryImages` - dette bør fikses, da der bare skal være overensstemmelse mellem data og function
            const categoryKey = product.category;

            //placeholderbillederne - dette er midlertidigt
            const imageUrl = categoryImages[categoryKey] || categoryImages["placeholder"];

            productCard.innerHTML = `
                <img src="${imageUrl}" alt="${product.category}" class="product-image">
                <h3>${product.name}</h3>
                <p>Pris: ${product.price} DKK</p>
            `;

            productGrid.appendChild(productCard);

            productCard.addEventListener("click", () =>
                addToOrder(product))
            console.log(`Klikket på produkt: ${product.name} - Pris: ${product.price} DKK`);
        });

    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

function addToOrder(product) {
    // Find om produktet allerede er i kurven
    let existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        // Hvis produktet findes, øg quantity
        existingItem.quantity++;
    } else {
        // Hvis produktet ikke findes, tilføj det med quantity 1
        cart.push({ ...product, quantity: 1 });
    }

    renderCart();
}


function renderCart() {
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = "";
    cart.forEach(product => {
        renderProduct(product);
    })
    updateTotal();
}

function renderProduct(product) {
    const orderList = document.getElementById("order-list");

    const orderItem = document.createElement("li");
    orderItem.textContent = `${product.name} - ${product.price} DKK`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.style.marginLeft = "10px";

    deleteButton.addEventListener("click", () => removeProductFromOrder(product));

    orderItem.appendChild(deleteButton);
    orderList.appendChild(orderItem)
}

function removeProductFromOrder(product) {
    const index = cart.indexOf(product);
    if (index !== -1) {
        cart.splice(index, 1);
    }
    renderCart();
}

function updateTotal() {
    const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    console.log("Total opdateret til:", total);
    document.getElementById("order-total").textContent = `${total.toFixed(2)}`;
}

const cancelButton = document.getElementById("cancel-purchase");
cancelButton.addEventListener("click", () =>{
    cart.length = 0;
    renderCart()
})

async function submitOrder() {
    if (cart.length === 0) {
        alert("kurven er tom");
        return;
    }

    const totalPrice = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

    const orderData = {
        totalPrice: totalPrice,
        items: cart.map(item => ({
           product: {id: item.id},
            quantity: Number(item.quantity),
            subTotal: Number(item.price) * Number(item.quantity)
        }))
    };

    console.log(JSON.stringify(orderData, null, 2));

    try {
        const response = await fetch(orderURL, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify(orderData),
        });

        if (!response.ok) {
            throw new Error(`Fejl ved bestilling: ${response.status}`);
        }

        cart.length = 0;
        renderCart();

    } catch (error) {
        console.error("Fejlen er:", error);
    }
}

document.getElementById("confirm-purchase").addEventListener("click", ()=> {
    submitOrder();
    alert('ordre bekræftet')

});


fetchProducts();

