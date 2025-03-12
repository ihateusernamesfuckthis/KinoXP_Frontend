const URL = 'http://localhost:8080/api/products';
//const URL = 'https://kinoxpbackend-fvaccreadvb9exd8.northeurope-01.azurewebsites.net/api/products';

//midlertidige placeholder billeder til udvikling
const categoryImages = {
    "snacks": "../images/snacks.png",
    "candy": "../images/candy.png",
    "drinks": "../images/soda.png",
    "chocolate": "../images/chocolate.png",
    "placeholder": "../images/placeholder.png"
};

let selectedProduct = null;
const confirmButton = document.getElementById("confirm-edit");

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
        productGrid.innerHTML = "";

        const addProductCard = document.createElement("div");
        addProductCard.classList.add("productCard", "addProductCard");
        addProductCard.innerHTML = `
        <div class="add-product">
            <p>➕ Tilføj nyt produkt</p>
        </div>
    `;

        addProductCard.addEventListener("click", () => addNewProduct());

        productGrid.appendChild(addProductCard);

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
                <p>Kategori: ${product.category}</p>
            `;
            productGrid.appendChild(productCard);

            productCard.addEventListener("click", ()=>{
                console.log("clicked");
                editProduct(product);
            });
        });

    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

function editProduct(product) {
selectedProduct = product;

    document.getElementById("edit-name").value = product.name;
    document.getElementById("edit-price").value = product.price;
    document.getElementById("edit-category").value = product.category;
    //document.getElementById("edit-image").value = product.image;
}

confirmButton.addEventListener("click", async () => {
    const productData = {
        name: document.getElementById("edit-name").value,
        price: document.getElementById("edit-price").value,
        category: document.getElementById("edit-category").value,
    };

    if (selectedProduct) {
        // Opdater eksisterende produkt
        try {
            const response = await fetch(`${URL}/${selectedProduct.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            console.log("Produkt opdateret:", productData);
        } catch (error) {
            console.error("Fejl ved opdatering af produkt:", error);
        }
    } else {
        // Tilføj nyt produkt
        try {
            const response = await fetch(URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            console.log("Nyt produkt tilføjet:", productData);
        } catch (error) {
            console.error("Fejl ved tilføjelse af produkt:", error);
        }
    }

    fetchProducts(); // Opdater produktlisten
});



function addNewProduct() {
    selectedProduct = null; // Sikrer at vi ikke redigerer et eksisterende produkt

    document.getElementById("edit-name").value = "";
    document.getElementById("edit-price").value = "";
    document.getElementById("edit-category").value = "snacks"; // Default kategori

    console.log("Opretter nyt produkt");
}


fetchProducts()