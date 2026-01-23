# Frontend Update Guide - Predefined Items & Payment at Delivery

This document outlines the API changes for the new predefined items system and payment workflow.

---

## Overview of Changes

1. **Predefined Items**: Each pressing can have a catalog of items with preset prices
2. **Order Creation**: Items now include prices, total is auto-calculated
3. **Payment at Delivery**: Payment is recorded when order is delivered, not at creation
4. **New Payment Methods**: Cash, Bankily, Masrivi, Sedad, Amanty, BimBank, Click, Autres
5. **PressingId from JWT**: No need to send pressingId - it's automatically taken from the authenticated user's JWT token

---

## 1. Predefined Items (PressingItem)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pressing-items` | **Get items for current user's pressing** (from JWT) |
| `GET` | `/api/pressing-items/pressing/{pressingId}` | Get items for specific pressing (ADMIN only) |
| `GET` | `/api/pressing-items/{id}` | Get single item |
| `POST` | `/api/pressing-items` | Create new item (pressing from JWT) |
| `PUT` | `/api/pressing-items/{id}` | Update item |
| `DELETE` | `/api/pressing-items/{id}` | Delete item |

### Response Structure

```typescript
interface PressingItem {
  id: number;
  pressingId: number;
  pressingName: string;
  label: string;
  price: number; // BigDecimal as number
  createdAt: string; // ISO timestamp
  updatedAt: string;
}
```

### Create Item Request

```typescript
// NOTE: pressingId is automatically taken from JWT - don't send it!
interface CreatePressingItemRequest {
  label: string;
  price: number;
}
```

### Update Item Request

```typescript
interface UpdatePressingItemRequest {
  label: string;
  price: number;
}
```

### Example: Fetch Items for Current Pressing

```typescript
// GET /api/pressing-items
// The backend automatically uses the pressingId from your JWT token
const response = await fetch('/api/pressing-items', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const items: PressingItem[] = await response.json();
// [
//   { id: 1, label: "Chemise", price: 500.00, ... },
//   { id: 2, label: "Pantalon", price: 400.00, ... },
//   { id: 3, label: "Costume", price: 1500.00, ... }
// ]
```

### Example: Create Item

```typescript
// POST /api/pressing-items
// No need to send pressingId - it comes from JWT
const newItem = {
  label: "Chemise",
  price: 500.00
};

const response = await fetch('/api/pressing-items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newItem)
});
```

---

## 2. Order Creation (Updated)

### Changes
- **Removed**: `paymentAmount`, `paymentMethod`, and `pressingId` fields
- **Added**: `price` field in each item
- **Auto-calculated**: `totalAmount` = sum of (quantity x price) for all items
- **PressingId**: Automatically taken from JWT token
- **Auto-save Custom Items**: Any new item (not already in the catalog) is automatically saved to the pressing's items for future use

### New Create Order Request

```typescript
interface OrderItemRequest {
  label: string;
  quantity: number;
  price: number; // Required - from predefined item or custom
}

// NOTE: pressingId is automatically taken from JWT - don't send it!
interface CreateOrderRequest {
  clientId: number;
  items: OrderItemRequest[];
  // pressingId - REMOVED (comes from JWT)
  // paymentAmount - REMOVED
  // paymentMethod - REMOVED
}
```

### Example: Create Order

```typescript
// POST /api/orders
// No need to send pressingId - it comes from JWT
const order = {
  clientId: 5,
  items: [
    { label: "Chemise", quantity: 3, price: 500.00 },  // From predefined
    { label: "Pantalon", quantity: 2, price: 400.00 }, // From predefined
    { label: "Rideau custom", quantity: 1, price: 800.00 } // Custom item
  ]
};

const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(order)
});

// Response includes calculated totalAmount
// totalAmount = (3 x 500) + (2 x 400) + (1 x 800) = 3100.00

// IMPORTANT: "Rideau custom" is automatically saved to the pressing's catalog!
// Next time you fetch /api/pressing-items, it will appear in the list.
```

### Auto-Save Custom Items Feature

When creating an order, **any item that doesn't exist in the pressing's catalog is automatically added** to the catalog for future use.

**How it works:**
1. Backend checks each item's label against existing pressing items (case-insensitive match)
2. If an item with the same label doesn't exist, it's automatically created with the provided price
3. The item becomes available in the catalog immediately for the next order

**Example Flow:**

```typescript
// First order with custom item
POST /api/orders
{
  clientId: 5,
  items: [
    { label: "Chemise", quantity: 2, price: 500 },    // Exists in catalog
    { label: "Rideau Special", quantity: 1, price: 1200 }  // NEW - doesn't exist
  ]
}

// "Rideau Special" is now automatically saved to the pressing's catalog

// Later, fetch catalog
GET /api/pressing-items
// Response now includes:
[
  { id: 1, label: "Chemise", price: 500, ... },
  { id: 2, label: "Pantalon", price: 400, ... },
  { id: 15, label: "Rideau Special", price: 1200, ... }  // Auto-added!
]

// Next order can use it from the catalog
POST /api/orders
{
  clientId: 6,
  items: [
    { label: "Rideau Special", quantity: 2, price: 1200 }  // Now a predefined item
  ]
}
```

**Benefits:**
- No need to manually add items before using them
- Catalog grows organically based on actual usage
- Users can still pre-define items if they want consistent pricing

**Note:** Matching is done by label only (case-insensitive). If you create an order with "chemise" and "Chemise" already exists, it won't create a duplicate.

### Updated Order Response

```typescript
interface OrderItemResponse {
  id: number;
  label: string;
  quantity: number;
  price: number; // NEW - item price
}

interface OrderResponse {
  id: number;
  referenceCode: string;
  pressingId: number;
  pressingName: string;
  clientId: number;
  clientName: string;
  plantId: number | null;
  plantName: string | null;
  status: OrderStatus;
  totalAmount: number; // NEW - calculated total
  items: OrderItemResponse[];
  payment: PaymentResponse | null; // null until DELIVERED
  statusHistory: OrderStatusHistoryResponse[];
  createdAt: string;
}
```

---

## 3. Payment at Delivery (New Workflow)

### Old Workflow
```
Create Order -> Payment Initiated -> ... -> Delivered -> Confirm Payment
```

### New Workflow
```
Create Order (no payment) -> ... -> DELIVERED -> Record Payment
```

### Record Payment Endpoint

```
POST /api/orders/record-payment
```

### Request Body

```typescript
interface RecordPaymentRequest {
  orderId: number;
  paymentMethod: PaymentMethod;
}
```

### Payment Methods (Updated)

```typescript
type PaymentMethod =
  | 'CASH'
  | 'BANKILY'
  | 'MASRIVI'
  | 'SEDAD'
  | 'AMANTY'
  | 'BIMBANK'
  | 'CLICK'
  | 'AUTRES';
```

### Example: Record Payment

```typescript
// POST /api/orders/record-payment
const payment = {
  orderId: 123,
  paymentMethod: 'BANKILY'
};

const response = await fetch('/api/orders/record-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payment)
});

// Returns PaymentResponse
// {
//   id: 45,
//   amount: 3100.00, // Auto from order totalAmount
//   method: "BANKILY",
//   status: "PAID",
//   paidAt: "2026-01-22T10:30:00Z",
//   createdAt: "2026-01-22T10:30:00Z"
// }
```

### Important Rules
- Payment can **only** be recorded when order status is `DELIVERED`
- Payment amount is automatically taken from `order.totalAmount`
- Each order can only have one payment record

---

## 4. JWT Token Claims

The backend extracts the following from your JWT token:

```typescript
interface JwtClaims {
  userId: number;
  userName: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'PLANT_OPERATOR';
  pressingId: number | null;  // For SUPERVISOR
  plantId: number | null;     // For PLANT_OPERATOR
}
```

This means:
- **SUPERVISOR**: Can only create orders/items for their own pressing (pressingId from JWT)
- **PLANT_OPERATOR**: Cannot create orders/items (no pressingId)
- **ADMIN**: Can access all pressings

---

## 5. Frontend UI Components

### 5.1 Item Selection Component (Order Creation)

```tsx
// Example React component for item selection
function ItemSelector({ onItemsChange }) {
  const [predefinedItems, setPredefinedItems] = useState<PressingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItemRequest[]>([]);
  const [customItem, setCustomItem] = useState({ label: '', price: 0, quantity: 1 });

  useEffect(() => {
    // Fetch predefined items - no pressingId needed, comes from JWT
    fetch('/api/pressing-items', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setPredefinedItems);
  }, []);

  const addPredefinedItem = (item: PressingItem) => {
    const existing = selectedItems.find(i => i.label === item.label);
    if (existing) {
      setSelectedItems(items => items.map(i =>
        i.label === item.label
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setSelectedItems([...selectedItems, {
        label: item.label,
        quantity: 1,
        price: item.price
      }]);
    }
  };

  const addCustomItem = () => {
    if (customItem.label && customItem.price > 0) {
      setSelectedItems([...selectedItems, { ...customItem }]);
      setCustomItem({ label: '', price: 0, quantity: 1 });
    }
  };

  const total = selectedItems.reduce(
    (sum, item) => sum + (item.quantity * item.price),
    0
  );

  return (
    <div>
      {/* Predefined Items Grid */}
      <div className="predefined-items">
        <h3>Articles disponibles</h3>
        {predefinedItems.map(item => (
          <button key={item.id} onClick={() => addPredefinedItem(item)}>
            {item.label} - {item.price} MRU
          </button>
        ))}
      </div>

      {/* Custom Item Form */}
      <div className="custom-item">
        <h3>Article personnalise</h3>
        <p className="help-text">
          💡 Les articles personnalises seront automatiquement ajoutes au catalogue
        </p>
        <input
          placeholder="Nom de l'article"
          value={customItem.label}
          onChange={e => setCustomItem({...customItem, label: e.target.value})}
        />
        <input
          type="number"
          placeholder="Prix"
          value={customItem.price}
          onChange={e => setCustomItem({...customItem, price: Number(e.target.value)})}
        />
        <button onClick={addCustomItem}>Ajouter</button>
      </div>

      {/* Selected Items */}
      <div className="selected-items">
        <h3>Articles selectionnes</h3>
        {selectedItems.map((item, idx) => (
          <div key={idx}>
            {item.label} x{item.quantity} = {item.quantity * item.price} MRU
          </div>
        ))}
        <div className="total">
          <strong>Total: {total} MRU</strong>
        </div>
      </div>
    </div>
  );
}
```

### 5.2 Payment Recording Component (Delivery)

```tsx
function PaymentRecorder({ order, onPaymentRecorded }) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: 'Especes' },
    { value: 'BANKILY', label: 'Bankily' },
    { value: 'MASRIVI', label: 'Masrivi' },
    { value: 'SEDAD', label: 'Sedad' },
    { value: 'AMANTY', label: 'Amanty' },
    { value: 'BIMBANK', label: 'BimBank' },
    { value: 'CLICK', label: 'Click' },
    { value: 'AUTRES', label: 'Autres' },
  ];

  const recordPayment = async () => {
    if (!selectedMethod) return;

    setLoading(true);
    try {
      const response = await fetch('/api/orders/record-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod: selectedMethod
        })
      });

      if (response.ok) {
        const payment = await response.json();
        onPaymentRecorded(payment);
      }
    } finally {
      setLoading(false);
    }
  };

  // Only show if order is DELIVERED and no payment exists
  if (order.status !== 'DELIVERED' || order.payment) {
    return null;
  }

  return (
    <div className="payment-recorder">
      <h3>Enregistrer le paiement</h3>
      <p>Montant: <strong>{order.totalAmount} MRU</strong></p>

      <div className="payment-methods">
        {paymentMethods.map(method => (
          <button
            key={method.value}
            className={selectedMethod === method.value ? 'selected' : ''}
            onClick={() => setSelectedMethod(method.value)}
          >
            {method.label}
          </button>
        ))}
      </div>

      <button
        onClick={recordPayment}
        disabled={!selectedMethod || loading}
      >
        {loading ? 'En cours...' : 'Confirmer le paiement'}
      </button>
    </div>
  );
}
```

### 5.3 Pressing Items Management (Admin/Supervisor)

```tsx
function PressingItemsManager() {
  const [items, setItems] = useState<PressingItem[]>([]);
  const [newItem, setNewItem] = useState({ label: '', price: 0 });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    // No pressingId needed - comes from JWT
    const response = await fetch('/api/pressing-items', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setItems(await response.json());
  };

  const createItem = async () => {
    // No pressingId needed - comes from JWT
    await fetch('/api/pressing-items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newItem)  // Just label and price
    });
    setNewItem({ label: '', price: 0 });
    loadItems();
  };

  const updateItem = async (id: number, data: { label: string; price: number }) => {
    await fetch(`/api/pressing-items/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    loadItems();
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Supprimer cet article?')) return;
    await fetch(`/api/pressing-items/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadItems();
  };

  return (
    <div className="items-manager">
      <h2>Gestion des articles</h2>

      {/* Add new item */}
      <div className="add-item">
        <input
          placeholder="Nom de l'article"
          value={newItem.label}
          onChange={e => setNewItem({...newItem, label: e.target.value})}
        />
        <input
          type="number"
          placeholder="Prix (MRU)"
          value={newItem.price || ''}
          onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
        />
        <button onClick={createItem}>Ajouter</button>
      </div>

      {/* Items list */}
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Prix (MRU)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.label}</td>
              <td>{item.price}</td>
              <td>
                <button onClick={() => deleteItem(item.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 6. Complete Workflow Summary

### Supervisor Workflow

```
1. MANAGE ITEMS (once)
   GET /api/pressing-items              -> View your catalog (pressingId from JWT)
   POST /api/pressing-items             -> Add item (pressingId from JWT)
   PUT /api/pressing-items/{id}         -> Update price
   DELETE /api/pressing-items/{id}      -> Remove item

2. CREATE ORDER
   GET /api/pressing-items              -> Load your item catalog
   POST /api/orders                     -> Create with items + prices (pressingId from JWT)
   (totalAmount auto-calculated, no payment yet)

3. COLLECT ORDER
   POST /api/orders/bulk-update-status
   { orderIds: [1,2,3], newStatus: "COLLECTED" }

4. RECEIVE BACK & DELIVER
   POST /api/orders/bulk-update-status
   { orderIds: [1,2,3], newStatus: "READY" }

   POST /api/orders/bulk-update-status
   { orderIds: [1,2,3], newStatus: "DELIVERED" }

5. RECORD PAYMENT (after delivery)
   POST /api/orders/record-payment
   { orderId: 1, paymentMethod: "BANKILY" }
```

### Order Lifecycle

```
+--------------+
|   CREATED    |  <- Order created, totalAmount calculated, NO payment
+------+-------+
       | Supervisor marks collected
       v
+--------------+
|  COLLECTED   |  <- Driver picked up, visible to all plants
+------+-------+
       | Plant operator receives
       v
+---------------------+
|  RECEIVED_AT_PLANT  |  <- Assigned to specific plant
+------+--------------+
       |
       v
+--------------+
|  PROCESSING  |
+------+-------+
       |
       v
+--------------+
|  PROCESSED   |
+------+-------+
       |
       v
+--------------+
|  DISPATCHED  |  <- Ready for pickup by driver
+------+-------+
       | Supervisor receives back
       v
+--------------+
|    READY     |  <- At pressing, waiting for client
+------+-------+
       | Client picks up
       v
+--------------+
|  DELIVERED   |  <- NOW payment can be recorded
+------+-------+
       | POST /api/orders/record-payment
       v
+--------------+
|    PAID      |  <- Payment recorded with method
+--------------+
```

---

## 7. Error Handling

### Payment Recording Errors

```typescript
// Error: Order not in DELIVERED status
// Status: 400
{
  "error": "Payment can only be recorded when order is DELIVERED"
}

// Error: Payment already exists
// Status: 400
{
  "error": "Payment already recorded for this order"
}
```

### Order Creation Errors

```typescript
// Error: User has no pressingId (e.g., PLANT_OPERATOR trying to create order)
// Status: 403 Forbidden

// Error: Missing price
// Status: 400
{
  "error": "Price is required"
}

// Error: Invalid price
// Status: 400
{
  "error": "Price must be positive"
}
```

---

## 8. Migration Notes

### Breaking Changes

1. **CreateOrderRequest**: Remove `pressingId`, `paymentAmount`, and `paymentMethod` fields
2. **CreatePressingItemRequest**: Remove `pressingId` field
3. **OrderItemRequest**: Add required `price` field
4. **Payment flow**: Change from confirm to record
5. **Pressing Items endpoint**: Use `GET /api/pressing-items` instead of `GET /api/pressing-items/pressing/{id}`

### Data Migration
- Existing orders with `totalAmount = 0` are legacy orders
- Existing `WALLET` payment method converted to `BANKILY`

### Recommended Frontend Updates Order

1. Update TypeScript interfaces (remove pressingId from requests)
2. Update order creation form (remove pressingId, add item prices)
3. Update pressing items management (remove pressingId, use new endpoint)
4. Update payment UI (move to delivery screen)
5. Update payment method options

---

## 9. Key Features Summary

### 🔐 Security Improvements
- **PressingId from JWT**: No client-side manipulation possible - pressing context always comes from authenticated user
- **Role-based restrictions**: SUPERVISOR can only work with their own pressing, PLANT_OPERATOR cannot create orders/items

### 🏷️ Smart Item Management
- **Auto-save custom items**: Any new item used in an order is automatically added to the catalog
- **Organic catalog growth**: Catalog builds naturally based on actual usage
- **Case-insensitive matching**: "chemise" and "Chemise" are treated as the same item
- **Flexible pricing**: Can use predefined prices or custom prices per order

### 💰 Improved Payment Flow
- **Payment at delivery**: More accurate reflection of business workflow
- **Auto-calculated totals**: `totalAmount = sum(quantity × price)` for all items
- **8 payment methods**: Cash, Bankily, Masrivi, Sedad, Amanty, BimBank, Click, Autres
- **Payment history**: Track when and how each order was paid

### 📊 Better Workflow
- **Simplified API**: No need to send pressingId - it's automatic
- **Consistent pricing**: Items maintain their catalog prices but can be adjusted per order
- **Audit trail**: Status history tracks who changed what and when
- **User attribution**: All changes record user ID and name for accountability

### 🎯 Developer Experience
- **Fewer fields to send**: CreateOrderRequest and CreatePressingItemRequest are simpler
- **Automatic validation**: Backend validates pressing ownership automatically
- **Clear error messages**: Helpful error responses for debugging
- **TypeScript-friendly**: Clean interfaces for type safety
