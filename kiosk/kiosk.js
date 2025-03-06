const URL = 'http://localhost:8080/api/products';
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
    cart.push(product);
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
    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    console.log("Total opdateret til:", total);
    document.getElementById("order-total").textContent = `${total.toFixed(2)}`;
}

const cancelButton = document.getElementById("cancel-purchase");
cancelButton.addEventListener("click", () =>{
    cart.length = 0;
    renderCart()
})




fetchProducts();

