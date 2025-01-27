const API_URL = 'http://localhost:3000/api';
let currentUser = null;

function showView(viewId) {
    document.querySelectorAll('main > section').forEach(section => section.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
}

function updateNavigation(isLoggedIn) {
    document.getElementById('login-nav').style.display = isLoggedIn ? 'none' : 'inline-block';
    document.getElementById('register-nav').style.display = isLoggedIn ? 'none' : 'inline-block';
    document.getElementById('inventory-nav').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('history-nav').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('logout-nav').style.display = isLoggedIn ? 'inline-block' : 'none';
}

  async function register(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (response.ok) {
            alert('Registered successfully. Please log in.');
            showView('login-view');
        } else {
            const error = await response.json();
            alert(`Registration failed: ${error.message}`);
        }
    } catch (error) {
        console.error('Error during registration:', error);
    }
}

async function login(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (response.ok) {
            const result = await response.json();
            currentUser = { id: result.userId, username: result.username };
            updateNavigation(true);
            showView('inventory-view');
            fetchProducts();
        } else {
            const error = await response.json();
            alert(`Login failed: ${error.message}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
    }
}

function logout() {
    currentUser = null;
    updateNavigation(false);
    showView('login-view');
}

// Product functions
async function fetchProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();
    displayProducts(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

function displayProducts(products) {
  const productList = document.getElementById('products');
  productList.innerHTML = '';
  
  products.forEach(product => {
    const li = document.createElement('li');
    li.setAttribute('data-product-id', product._id); // Add this line to set the product ID
    li.innerHTML = `
      <h3>${product.name}</h3>
      <p>Description: ${product.description}</p>
      <p>Price: ₹${product.price}</p>
      <p>Category: ${product.category}</p>
      <p>SKU: ${product.sku}</p>
      <p>Total Quantity: ${product.inventory.reduce((total, inv) => total + inv.quantity, 0)}</p>
      <p>Supplier: ${product.supplier ? product.supplier.name : 'N/A'}</p>
      <h4>Inventory:</h4>
      <ul>
        ${product.inventory.map(inv => `
          <li>${inv.location ? inv.location.name : 'Unknown'}: ${inv.quantity}</li>
        `).join('')}
      </ul>
      <button class="edit-product" data-id="${product._id}">Edit</button>
      <button class="delete-product" data-id="${product._id}">Delete</button>
      <button class="dispatch-product" data-id="${product._id}" data-name="${product.name}">Dispatch</button>
    `;
    productList.appendChild(li);
  });
}


async function addProduct(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const product = Object.fromEntries(formData.entries());
  product.userId = currentUser.id;
  
  // Parse inventory data
  product.inventory = Array.from(document.querySelectorAll('.inventory-item')).map(item => ({
    locationId: item.querySelector('.location-select').value,
    quantity: parseInt(item.querySelector('.quantity-input').value, 10)
  }));

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (response.ok) {
      event.target.reset();
      fetchProducts();
      fetchHistory();
    } else {
      const error = await response.json();
      alert(`Error adding product: ${error.message}`);
    }
  } catch (error) {
    console.error('Error adding product:', error);
  }
}

  

async function searchProducts() {
    const searchTerm = document.getElementById('search-input').value;
    try {
        const response = await fetch(`${API_URL}/products?search=${searchTerm}`);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error searching products:', error);
    }
}


async function deleteProduct(id) {
  if (!id) {
      console.error('No product ID provided for deletion');
      return;
  }

  if (!confirm('Are you sure you want to delete this product?')) {
      return;
  }

  try {
      const response = await fetch(`${API_URL}/products/${id}`, {
          method: 'DELETE',
          headers: { 
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
              userId: currentUser.id 
          })
      });

      const data = await response.json();

      if (response.ok && data.success) {
          // Remove the product from UI after deletion is confirmed
          const productElement = document.querySelector(`li[data-product-id="${id}"]`);
          if (productElement) {
              productElement.remove();
          }
          
          alert('Product deleted successfully');
          // Optionally fetch updated products list if needed
          fetchProducts(); 
      } else {
          // Log the error message and provide feedback to the user
          console.error(`Failed to delete product: ${data.message}`);
          alert(`Error deleting product: ${data.message || 'An unknown error occurred.'}`);
      }
  } catch (error) {
      console.error('Error during delete operation:', error);
      alert('An error occurred while trying to delete the product');
  }
}






// Dispatch functions
function showDispatchView(productId, productName) {
  document.getElementById('dispatch-product-id').value = productId;
  document.getElementById('dispatch-product-name').textContent = `Dispatching: ${productName}`;
  
  // Populate location options for dispatch
  const dispatchLocationSelect = document.getElementById('dispatch-location');
  populateLocationOptions(dispatchLocationSelect);
  
  showView('dispatch-view');
}


async function dispatchProduct(event) {
  event.preventDefault();
  const productId = document.getElementById('dispatch-product-id').value;
  const formData = new FormData(event.target);
  const dispatchData = Object.fromEntries(formData.entries());
  dispatchData.userId = currentUser.id;
  dispatchData.quantity = parseInt(dispatchData.quantity, 10);

  console.log('Dispatching product:', dispatchData);

  try {
    const response = await fetch(`${API_URL}/products/${productId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispatchData),
    });

    const result = await response.json();

    if (response.ok) {
      alert('Product dispatched successfully');
      showView('inventory-view');
      fetchProducts();
      fetchHistory();
    } else {
      alert(`Error dispatching product: ${result.message}`);
    }
  } catch (error) {
    console.error('Error dispatching product:', error);
    alert('An error occurred while dispatching the product');
  }
}




async function fetchHistory() {
    try {
      const response = await fetch(`${API_URL}/products/operations/history`);
      const result = await response.json();
      
      if (Array.isArray(result.data)) {
        displayHistory(result.data);
      } else {
        console.error('Unexpected response format:', result);
        displayNoHistoryMessage();
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      displayNoHistoryMessage();
    }
  }
  

  function displayHistory(history) {
    const historyBody = document.getElementById('history-body');
    historyBody.innerHTML = '';
    
    if (history.length === 0) {
      displayNoHistoryMessage();
      return;
    }
    
    history.forEach(operation => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(operation.timestamp).toLocaleString()}</td>
        <td>${operation.productName}</td>
        <td>${operation.operationType}</td>
        <td>${operation.quantity}</td>
        <td>${operation.location}</td>
        <td>${operation.username}</td>
      `;
      historyBody.appendChild(row);
    });
  }

  function displayNoHistoryMessage() {
    const historyBody = document.getElementById('history-body');
    historyBody.innerHTML = '<tr><td colspan="6">No warehouse operations found. Add, update, delete, or dispatch products to see the history.</td></tr>';
  }


  async function editProduct(id) {
    try {
      const response = await fetch(`${API_URL}/products/${id}`);
      const product = await response.json();
      
      document.getElementById('edit-product-id').value = product._id;
      document.getElementById('edit-product-name').value = product.name;
      document.getElementById('edit-product-description').value = product.description;
      document.getElementById('edit-product-price').value = product.price;
      document.getElementById('edit-product-category').value = product.category;
      document.getElementById('edit-product-sku').value = product.sku;
      
      const supplierSelect = document.getElementById('edit-product-supplier');
      await populateSupplierOptions(supplierSelect);
      supplierSelect.value = product.supplier ? product.supplier._id : '';
  
      const inventoryContainer = document.getElementById('edit-inventory-container');
      inventoryContainer.innerHTML = '';
      for (const inv of product.inventory) {
        const inventoryItem = await createInventoryItem(inventoryContainer.children.length, inv.locationId, inv.quantity);
        inventoryContainer.appendChild(inventoryItem);
      }
      
      showView('edit-product-view');
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  }

  async function addInventoryItemToEdit() {
    const inventoryContainer = document.getElementById('edit-inventory-container');
    const index = inventoryContainer.children.length;
    const inventoryItem = await createInventoryItem(index, '', 0);
    inventoryContainer.appendChild(inventoryItem);
  }

  async function updateProduct(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const productId = formData.get('id');
    const productData = Object.fromEntries(formData.entries());
    delete productData.id;
    productData.userId = currentUser.id;
  
    // Parse inventory data
    productData.inventory = Array.from(document.querySelectorAll('#edit-inventory-container .inventory-item')).map(item => ({
      locationId: item.querySelector('.location-select').value,
      quantity: parseInt(item.querySelector('.quantity-input').value, 10)
    }));
  
    try {
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
  
      if (response.ok) {
        alert('Product updated successfully');
        showView('inventory-view');
        fetchProducts();
        fetchHistory();
      } else {
        const error = await response.json();
        alert(`Error updating product: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  }


  async function fetchLocations() {
    try {
      const response = await fetch(`${API_URL}/locations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  async function fetchSuppliers() {
    try {
      const response = await fetch(`${API_URL}/suppliers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const suppliers = await response.json();
      return suppliers;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return []; // Return an empty array if there's an error
    }
  }
  
  async function populateSupplierOptions(selectElement) {
    try {
      const suppliers = await fetchSuppliers();
      if (suppliers.length === 0) {
        selectElement.innerHTML = '<option value="">No suppliers available</option>';
      } else {
        selectElement.innerHTML = suppliers.map(supplier => 
          `<option value="${supplier._id}">${supplier.name}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Error populating supplier options:', error);
      selectElement.innerHTML = '<option value="">Error loading suppliers</option>';
    }
  }
  
  async function populateLocationOptions(selectElement, selectedLocationId) {
    try {
      const locations = await fetchLocations();
      if (locations.length === 0) {
        selectElement.innerHTML = '<option value="">No locations available</option>';
      } else {
        selectElement.innerHTML = locations.map(location => 
          `<option value="${location._id}" ${location._id === selectedLocationId ? 'selected' : ''}>${location.name}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Error populating location options:', error);
      selectElement.innerHTML = '<option value="">Error loading locations</option>';
    }
  }

  async function createInventoryItem(index, locationId, quantity) {
    const div = document.createElement('div');
    div.className = 'inventory-item';
    div.innerHTML = `
      <select class="location-select" name="inventory[${index}][locationId]"></select>
      <input type="number" class="quantity-input" name="inventory[${index}][quantity]" value="${quantity}" min="0" required>
      <button type="button" class="remove-inventory">Remove</button>
    `;
    
    // Populate location options
    const locationSelect = div.querySelector('.location-select');
    await populateLocationOptions(locationSelect, locationId);
  
    // Add event listener to remove button
    div.querySelector('.remove-inventory').addEventListener('click', () => div.remove());
  
    return div;
  }

  function removeProductFromUI(productId) {
    const productElement = document.querySelector(`li[data-product-id="${productId}"]`);
    if (productElement) {
      productElement.remove();
    }
  }
  


// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    
   // Navigation links
   document.getElementById('login-nav').addEventListener('click', () => showView('login-view'));
   document.getElementById('register-nav').addEventListener('click', () => showView('register-view'));
   document.getElementById('inventory-nav').addEventListener('click', () => showView('inventory-view'));
   document.getElementById('history-nav').addEventListener('click', () => {
    showView('history-view');
    fetchHistory();
  });
  
   document.getElementById('logout-nav').addEventListener('click', logout);

   // Forms
   document.getElementById('login-form').addEventListener('submit', login);
   document.getElementById('register-form').addEventListener('submit', register);
   document.getElementById('add-product-form').addEventListener('submit', addProduct);
   document.getElementById('search-button').addEventListener('click', searchProducts);

   // Product actions
   document.getElementById('products').addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-product')) {
      const productId = e.target.getAttribute('data-id');
      if (productId) {
        e.preventDefault();
        await deleteProduct(productId);
      }
    } else if (e.target.classList.contains('edit-product')) {
      editProduct(e.target.dataset.id);
    } else if (e.target.classList.contains('dispatch-product')) {
      showDispatchView(e.target.dataset.id, e.target.dataset.name);
    }
  });
   document.getElementById('add-inventory').addEventListener('click', async () => {
    const inventoryContainer = document.getElementById('inventory-container');
    const index = inventoryContainer.children.length;
    const inventoryItem = await createInventoryItem(index, '', 0);
    inventoryContainer.appendChild(inventoryItem);
  });
  // Populate supplier options
  const addProductSupplierSelect = document.getElementById('product-supplier');
  populateSupplierOptions(addProductSupplierSelect);


   // Dispatch form submission
   document.getElementById('dispatch-form').addEventListener('submit', dispatchProduct);
   document.getElementById('edit-product-form').addEventListener('submit', updateProduct);
   document.getElementById('add-edit-inventory').addEventListener('click', addInventoryItemToEdit);

   // Show login view on initial load
   showView('login-view');
});
