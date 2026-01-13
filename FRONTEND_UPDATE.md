# Frontend Update: Business Entities & Order Management

The backend has been extended with complete order management functionality. Update the frontend to support clients, orders, order items, and payments.

---

## New Business Entities

### 1. **Pressing** (Updated)
- Added `active` field (boolean)
- `address` field remains

### 2. **Client**
- Represents customers of a pressing
- Fields: id, fullName, phone (optional), pressingId, pressingName, createdAt

### 3. **Order**
- Order placed by a client
- Fields: id, referenceCode, pressingId, pressingName, clientId, clientName, status, items[], payment, createdAt
- **Status**: CREATED → IN_PROGRESS → READY → DELIVERED

### 4. **OrderItem**
- Items in an order (e.g., "shirt", "pants")
- Fields: id, label, quantity

### 5. **Payment**
- Payment for an order
- Fields: id, amount, method (CASH/WALLET), status (INITIATED/PAID), paidAt, createdAt
- **Flow**: INITIATED at order creation → PAID at delivery confirmation

---

## New API Endpoints

### **Client Management**

#### 1. Create Client
**Endpoint:** `POST /api/clients`
**Auth:** Required (JWT)
**Permission:** ADMIN (all pressings), SUPERVISOR (own pressing only)

**Request:**
```json
{
  "fullName": "John Doe",
  "phone": "+1234567890",
  "pressingId": 1
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "fullName": "John Doe",
  "phone": "+1234567890",
  "pressingId": 1,
  "pressingName": "Main Pressing",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### 2. Get Clients by Pressing
**Endpoint:** `GET /api/clients/pressing/{pressingId}`
**Auth:** Required (JWT)
**Permission:** ADMIN (all pressings), SUPERVISOR (own pressing only)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "fullName": "John Doe",
    "phone": "+1234567890",
    "pressingId": 1,
    "pressingName": "Main Pressing",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### 3. Get Client by ID
**Endpoint:** `GET /api/clients/{id}`
**Auth:** Required (JWT)
**Permission:** ADMIN (all clients), SUPERVISOR (own pressing clients only)

---

### **Order Management**

#### 1. Create Order
**Endpoint:** `POST /api/orders`
**Auth:** Required (JWT)
**Permission:** ADMIN (all pressings), SUPERVISOR (own pressing only)

**Request:**
```json
{
  "clientId": 1,
  "pressingId": 1,
  "items": [
    {
      "label": "shirt",
      "quantity": 2
    },
    {
      "label": "pants",
      "quantity": 1
    }
  ],
  "paymentAmount": 25.50,
  "paymentMethod": "CASH"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "referenceCode": "P1-20240115-0001",
  "pressingId": 1,
  "pressingName": "Main Pressing",
  "clientId": 1,
  "clientName": "John Doe",
  "status": "CREATED",
  "items": [
    {
      "id": 1,
      "label": "shirt",
      "quantity": 2
    },
    {
      "id": 2,
      "label": "pants",
      "quantity": 1
    }
  ],
  "payment": {
    "id": 1,
    "amount": 25.50,
    "method": "CASH",
    "status": "INITIATED",
    "paidAt": null,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Reference Code Format:** `P{pressingId}-{YYYYMMDD}-{sequence}`
Example: `P1-20240115-0001` (Pressing 1, Jan 15 2024, first order)

#### 2. Get Orders by Pressing
**Endpoint:** `GET /api/orders/pressing/{pressingId}`
**Auth:** Required (JWT)
**Permission:** ADMIN (all pressings), SUPERVISOR (own pressing only)

**Response:** Array of OrderResponse objects

#### 3. Get Order by ID
**Endpoint:** `GET /api/orders/{id}`
**Auth:** Required (JWT)
**Permission:** ADMIN (all orders), SUPERVISOR (own pressing orders only)

#### 4. Get Order by Reference Code
**Endpoint:** `GET /api/orders/reference/{referenceCode}`
**Auth:** Required (JWT)
**Permission:** ADMIN (all orders), SUPERVISOR (own pressing orders only)

**Example:** `GET /api/orders/reference/P1-20240115-0001`

#### 5. Update Order Status
**Endpoint:** `PATCH /api/orders/{id}/status?status={newStatus}`
**Auth:** Required (JWT)
**Permission:** ADMIN (all orders), SUPERVISOR (own pressing orders only)

**Query Parameter:** `status` - One of: CREATED, IN_PROGRESS, READY, DELIVERED

**Example:** `PATCH /api/orders/1/status?status=IN_PROGRESS`

**Response (200 OK):** Updated OrderResponse

#### 6. Confirm Payment
**Endpoint:** `POST /api/orders/{id}/confirm-payment`
**Auth:** Required (JWT)
**Permission:** ADMIN (all orders), SUPERVISOR (own pressing orders only)

**Action:**
- Updates payment status to PAID
- Sets paidAt timestamp
- Updates order status to DELIVERED

**Response (200 OK):**
```json
{
  "id": 1,
  "amount": 25.50,
  "method": "CASH",
  "status": "PAID",
  "paidAt": "2024-01-15T14:00:00Z",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Frontend Features to Implement

### 1. **Client Management Screen** (ADMIN & SUPERVISOR)
**Location:** `/clients` or under pressing management

**Features:**
- View list of clients for current pressing
- Add new client form:
  - Full name (required)
  - Phone number (optional)
  - Pressing selector (ADMIN only, auto-filled for SUPERVISOR)
- Search/filter clients by name or phone
- View client details (orders history)

**UI Components:**
- Client list table/cards
- "Add Client" button → modal/form
- Client search bar

---

### 2. **Order Creation Screen** (ADMIN & SUPERVISOR)
**Location:** `/orders/new`

**Features:**
- **Step 1:** Select or create client
  - Search existing clients
  - Quick "Add New Client" button

- **Step 2:** Add order items
  - Label input (e.g., "shirt", "pants", "jacket")
  - Quantity input (min: 1)
  - Add/remove items dynamically
  - Display items list with edit/delete

- **Step 3:** Payment details
  - Amount input (decimal, required)
  - Payment method selector (CASH/WALLET)

- **Step 4:** Review and submit
  - Display: Client, Items, Total amount, Payment method
  - Submit button → Creates order → Shows reference code

**Success Flow:**
- Show success message with **reference code** prominently
- Offer to print ticket (reference code + items)
- Navigate to order details or create another order

**UI Components:**
- Multi-step form or wizard
- Client selector with autocomplete
- Dynamic item list with add/remove
- Payment method radio buttons
- Print-friendly order ticket view

---

### 3. **Order List Screen** (ADMIN & SUPERVISOR)
**Location:** `/orders`

**Features:**
- View all orders for current pressing
- Filter by status (CREATED, IN_PROGRESS, READY, DELIVERED)
- Search by reference code or client name
- Display: Reference code, Client, Status, Items count, Amount, Date
- Click row → Go to order details

**UI Components:**
- Orders table/grid with status badges
- Status filter tabs/dropdown
- Search bar (reference code or client name)
- Status badge colors:
  - CREATED: Gray
  - IN_PROGRESS: Blue
  - READY: Yellow/Orange
  - DELIVERED: Green

---

### 4. **Order Details Screen** (ADMIN & SUPERVISOR)
**Location:** `/orders/{id}` or `/orders/ref/{referenceCode}`

**Display:**
- Reference code (large, prominent, printable)
- Client name and phone
- Order status with badge
- Items list (label, quantity)
- Payment details (amount, method, status, paid date)
- Created date

**Actions:**
- **Update Status** button (dropdown or stepper)
  - CREATED → IN_PROGRESS
  - IN_PROGRESS → READY
  - READY → (requires payment confirmation)

- **Confirm Payment** button (if status = READY and payment = INITIATED)
  - Shows confirmation dialog
  - On confirm: Payment → PAID, Order → DELIVERED

- **Print Ticket** button
  - Print-friendly view with reference code, items, and barcode/QR

**UI Components:**
- Order info card/panel
- Status stepper/timeline
- Items table
- Payment info card
- Action buttons with confirmation dialogs

---

### 5. **Quick Order Lookup** (ADMIN & SUPERVISOR)
**Location:** Dashboard or dedicated search page

**Feature:**
- Search bar: "Enter reference code"
- Type/scan reference code → Go to order details
- Useful for delivery counter

**UI:** Simple search input with autocomplete suggestions

---

## Permission Rules (Frontend)

### ADMIN
- ✅ Can view/create clients for **any pressing**
- ✅ Can view/create/update orders for **any pressing**
- ✅ Can select pressing when creating clients/orders

### SUPERVISOR
- ✅ Can view/create clients for **their pressing only**
- ✅ Can view/create/update orders for **their pressing only**
- ❌ Cannot select pressing (auto-filled from JWT)
- ❌ 403 Forbidden if accessing other pressing's data

**Frontend Should:**
- Hide pressing selector for SUPERVISOR users
- Auto-fill pressing ID from JWT token
- Handle 403 errors gracefully (show "Access Denied" message)
- Filter views to show only user's pressing data for SUPERVISOR

---

## State Management Updates

### Add to Store/Context:
```javascript
{
  // ... existing auth state

  clients: {
    list: [],
    loading: false,
    error: null
  },

  orders: {
    list: [],
    current: null,
    filters: {
      status: null,
      search: ''
    },
    loading: false,
    error: null
  }
}
```

### Actions Needed:
- `fetchClients(pressingId)` - Get clients for pressing
- `createClient(clientData)` - Create new client
- `fetchOrders(pressingId, status?)` - Get orders with optional filter
- `createOrder(orderData)` - Create new order
- `getOrderByRef(referenceCode)` - Quick lookup
- `updateOrderStatus(orderId, newStatus)` - Update status
- `confirmPayment(orderId)` - Mark payment as paid

---

## UI/UX Recommendations

### Order Reference Code
- **Display prominently** on success, tickets, and details
- **Large font** for easy reading
- **Copyable** (click to copy)
- **Printable** format for customer ticket
- Consider QR code generation for scanning

### Order Status Visual
- Use **color-coded badges**
- Show **progress stepper/timeline**
- Highlight **next action** (e.g., "Mark as Ready")

### Payment Confirmation
- **Clear warning:** "This will mark the order as delivered"
- **Confirmation dialog** before confirming payment
- Show **payment method** and **amount** in dialog

### Print Ticket Format
```
=================================
   MAIN PRESSING
=================================

Order: P1-20240115-0001
Client: John Doe
Phone: +1234567890
Date: Jan 15, 2024 10:30 AM

Items:
- shirt x2
- pants x1

Amount: $25.50
Method: CASH
Status: INITIATED

=================================
Thank you for your business!
=================================
```

---

## API Client Example

```javascript
// Create order
const createOrder = async (orderData) => {
  const response = await apiClient.post('/api/orders', {
    clientId: orderData.clientId,
    pressingId: orderData.pressingId,
    items: orderData.items, // [{ label, quantity }]
    paymentAmount: orderData.paymentAmount,
    paymentMethod: orderData.paymentMethod // 'CASH' or 'WALLET'
  });

  return response.data; // OrderResponse with referenceCode
};

// Update order status
const updateOrderStatus = async (orderId, newStatus) => {
  const response = await apiClient.patch(
    `/api/orders/${orderId}/status?status=${newStatus}`
  );

  return response.data;
};

// Confirm payment
const confirmPayment = async (orderId) => {
  const response = await apiClient.post(
    `/api/orders/${orderId}/confirm-payment`
  );

  return response.data; // PaymentResponse with paidAt
};

// Search by reference code
const findOrderByReference = async (referenceCode) => {
  const response = await apiClient.get(
    `/api/orders/reference/${referenceCode}`
  );

  return response.data;
};
```

---

## Testing Checklist

### ADMIN Testing
- ✅ Create clients for different pressings
- ✅ Create orders for different pressings
- ✅ View orders from multiple pressings
- ✅ Update order status across all pressings
- ✅ Confirm payments for any order

### SUPERVISOR Testing
- ✅ Create client for own pressing
- ✅ Cannot create client for other pressing (403)
- ✅ Create order for own pressing
- ✅ Cannot view orders from other pressing (403)
- ✅ Update status for own pressing orders
- ✅ Confirm payment for own pressing orders

### Order Flow Testing
1. Create client
2. Create order with items → Verify reference code format
3. Update status: CREATED → IN_PROGRESS
4. Update status: IN_PROGRESS → READY
5. Confirm payment → Verify status = DELIVERED, payment = PAID
6. Search by reference code → Verify order found

---

## Summary of Changes

**What's New:**
- Client management (CRUD for clients)
- Order creation with multiple items
- Payment tracking (initiated → paid)
- Reference code system for orders
- Order status workflow (4 stages)
- Payment confirmation at delivery

**Frontend Must Build:**
1. Client list & creation form
2. Multi-step order creation wizard
3. Orders list with status filtering
4. Order details with status updates
5. Payment confirmation flow
6. Print ticket functionality
7. Reference code lookup/search

**Key Business Rules:**
- Payment initiated at order creation
- Payment confirmed at delivery (triggers DELIVERED status)
- SUPERVISOR restricted to their pressing
- Reference codes are unique and human-readable
- Orders progress through defined status workflow
