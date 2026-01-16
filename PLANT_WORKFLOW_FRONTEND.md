# Frontend Guide: Plant/Laundry Facility System & Enhanced Workflow

Complete API documentation and UI guidelines for implementing the laundry processing plant system with 8-stage order workflow.

---

## Overview

This update adds a multi-location order processing system where orders move between customer-facing **Pressings** and centralized **Plants** (laundry processing facilities).

### Key Concepts

**Plants**: Laundry processing facilities where actual cleaning/pressing happens
- Multiple pressings send orders to fewer central plants
- Each plant has a unique name, address, and active/inactive status
- Plant operators manage orders within their facility

**Roles**:
- **ADMIN**: Full access to all resources
- **SUPERVISOR**: Manages orders for their pressing
- **PLANT_OPERATOR** (NEW): Manages orders at their plant facility

**Order Workflow**: Expanded from 4 to 8 statuses tracking physical movement

---

## New Order Workflow (8 Stages)

### Status Progression

```
┌─────────────┐
│   CREATED   │ ← Order created at pressing
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  COLLECTED  │ ← Driver picks up from pressing
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│ RECEIVED_AT_PLANT   │ ← Arrives at plant facility
└──────┬──────────────┘
       │
       ↓
┌─────────────┐
│ PROCESSING  │ ← Being cleaned/processed
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  PROCESSED  │ ← Cleaning complete
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ DISPATCHED  │ ← Sent back to pressing
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    READY    │ ← Back at pressing, ready for pickup
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  DELIVERED  │ ← Given to client
└─────────────┘
```

### Who Can Update Each Status

| Status | Who Can Set It | Location |
|--------|---------------|----------|
| `CREATED` | SUPERVISOR, ADMIN | Pressing |
| `COLLECTED` | SUPERVISOR, ADMIN | Driver/Pressing |
| `RECEIVED_AT_PLANT` | PLANT_OPERATOR, ADMIN | Plant |
| `PROCESSING` | PLANT_OPERATOR, ADMIN | Plant |
| `PROCESSED` | PLANT_OPERATOR, ADMIN | Plant |
| `DISPATCHED` | PLANT_OPERATOR, ADMIN | Plant |
| `READY` | SUPERVISOR, ADMIN | Pressing |
| `DELIVERED` | SUPERVISOR, ADMIN | Pressing |

---

## Updated JWT Response

### Login Response (Enhanced)

When users log in, the response now includes plant information for PLANT_OPERATOR users:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userId": 3,
  "userName": "John Smith",
  "role": "PLANT_OPERATOR",
  "pressingId": null,
  "pressingName": null,
  "plantId": 1,
  "plantName": "Main Processing Plant"
}
```

**JWT Claims:**
- `userId`: User ID
- `role`: "ADMIN", "SUPERVISOR", or "PLANT_OPERATOR"
- `pressingId`: ID of pressing (for ADMIN/SUPERVISOR) or null
- `plantId`: ID of plant (for PLANT_OPERATOR) or null

---

## API Endpoints

### 1. Plant Management (ADMIN Only)

#### Create Plant
**Endpoint:** `POST /api/plants`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR | ❌ PLANT_OPERATOR

**Request Body:**
```json
{
  "name": "Downtown Processing Plant",
  "address": "789 Industrial Blvd, City, State",
  "active": true
}
```

**Field Validations:**
- `name`: Required, non-empty, unique
- `address`: Optional
- `active`: Optional, defaults to `true`

**Success Response (201 Created):**
```json
{
  "id": 2,
  "name": "Downtown Processing Plant",
  "address": "789 Industrial Blvd, City, State",
  "active": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

#### Get All Plants
**Endpoint:** `GET /api/plants?activeOnly={boolean}`
**Auth:** Required
**Permission:** ✅ ADMIN | ✅ SUPERVISOR | ✅ PLANT_OPERATOR

**Query Parameters:**
- `activeOnly`: Optional boolean
  - `true` - Returns only active plants
  - `false` or omitted - Returns all plants

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Main Processing Plant",
    "address": "456 Industrial Ave",
    "active": true,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z"
  }
]
```

---

#### Get Plant by ID
**Endpoint:** `GET /api/plants/{id}`
**Auth:** Required
**Permission:** ✅ ADMIN | ✅ SUPERVISOR | ✅ PLANT_OPERATOR

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Main Processing Plant",
  "address": "456 Industrial Ave",
  "active": true,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-10T08:00:00Z"
}
```

---

#### Update Plant
**Endpoint:** `PUT /api/plants/{id}`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR | ❌ PLANT_OPERATOR

**Request Body (all fields optional):**
```json
{
  "name": "Main Processing Plant - Updated",
  "address": "456 New Industrial Ave",
  "active": false
}
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Main Processing Plant - Updated",
  "address": "456 New Industrial Ave",
  "active": false,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-15T11:45:00Z"
}
```

---

#### Delete Plant
**Endpoint:** `DELETE /api/plants/{id}`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR | ❌ PLANT_OPERATOR

**Success Response (204 No Content):** Empty body

**⚠️ Warning:** Deleting a plant will affect all associated data.

---

#### Toggle Plant Active Status
**Endpoint:** `PATCH /api/plants/{id}/toggle-active`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR | ❌ PLANT_OPERATOR

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Main Processing Plant",
  "address": "456 Industrial Ave",
  "active": false,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

---

### 2. Bulk Order Status Update

#### Bulk Update Order Status
**Endpoint:** `POST /api/orders/bulk-update-status`
**Auth:** Required
**Permission:** ✅ ADMIN | ✅ SUPERVISOR* | ✅ PLANT_OPERATOR*

*SUPERVISOR: Can only update orders from their pressing
*PLANT_OPERATOR: Can only update orders assigned to their plant

**Request Body:**
```json
{
  "orderIds": [15, 16, 17, 18],
  "newStatus": "RECEIVED_AT_PLANT",
  "plantId": 1
}
```

**Field Validations:**
- `orderIds`: Required, non-empty list of order IDs
- `newStatus`: Required, valid OrderStatus enum value
- `plantId`: Optional, required when status is `RECEIVED_AT_PLANT`

**Success Response (200 OK):**
```json
[
  {
    "id": 15,
    "referenceCode": "P1-20240115-0001",
    "pressingId": 1,
    "pressingName": "Main Pressing",
    "clientId": 5,
    "clientName": "John Doe",
    "plantId": 1,
    "plantName": "Main Processing Plant",
    "status": "RECEIVED_AT_PLANT",
    "items": [...],
    "payment": {...},
    "createdAt": "2024-01-15T09:00:00Z"
  },
  ...
]
```

**Error Responses:**
- `400 Bad Request`: Invalid order IDs or status
- `403 Forbidden`: User doesn't have permission for selected orders
- `404 Not Found`: Some order IDs not found

---

### 3. Updated Order Response

All order endpoints now return plant information:

**OrderResponse Structure:**
```json
{
  "id": 15,
  "referenceCode": "P1-20240115-0001",
  "pressingId": 1,
  "pressingName": "Main Pressing",
  "clientId": 5,
  "clientName": "John Doe",
  "plantId": 1,
  "plantName": "Main Processing Plant",
  "status": "PROCESSING",
  "items": [
    {
      "id": 30,
      "label": "Suit",
      "quantity": 1
    }
  ],
  "payment": {
    "id": 20,
    "amount": 25.00,
    "method": "CASH",
    "status": "INITIATED",
    "paidAt": null,
    "createdAt": "2024-01-15T09:00:00Z"
  },
  "createdAt": "2024-01-15T09:00:00Z"
}
```

**New Fields:**
- `plantId`: ID of plant processing the order (null if not assigned yet)
- `plantName`: Name of plant processing the order (null if not assigned yet)

---

## Frontend Implementation Guide

### 1. Plant Management Screen (ADMIN Only)

**Location:** `/admin/plants` or `/plants`

**Features:**
- Display all plants in a table/grid
- Show: Name, Address, Status (Active/Inactive), Created Date
- Filter: Active only / All
- Search: By name or address
- Actions (ADMIN only):
  - Create new plant button
  - Edit button per row
  - Delete button per row (with confirmation)
  - Toggle active/inactive button

**UI Components:**
```jsx
<PlantList>
  <Toolbar>
    <CreateButton /> {/* ADMIN only */}
    <SearchBar placeholder="Search plants..." />
    <FilterToggle options={['All', 'Active Only']} />
  </Toolbar>

  <Table>
    <Row>
      <Column>Name</Column>
      <Column>Address</Column>
      <Column>Status</Column> {/* Badge: Active (green) / Inactive (gray) */}
      <Column>Created</Column>
      <Column>Actions</Column> {/* ADMIN only */}
    </Row>
  </Table>

  <Pagination />
</PlantList>
```

---

### 2. Order Workflow Dashboard

#### For SUPERVISOR (Pressing-based)

**Location:** `/orders` or `/pressing/orders`

**View:** Orders for their pressing only

**Status Groups:**
- **At Pressing**: CREATED, READY
- **In Transit**: COLLECTED, DISPATCHED
- **At Plant**: RECEIVED_AT_PLANT, PROCESSING, PROCESSED
- **Completed**: DELIVERED

**Bulk Actions:**
- Select multiple CREATED orders → Mark as COLLECTED
- Select multiple READY orders → Mark as DELIVERED

**UI:**
```jsx
<OrderDashboard role="SUPERVISOR">
  <StatusColumn status="CREATED">
    <OrderCard selectable />
    <BulkActionButton>Mark as Collected</BulkActionButton>
  </StatusColumn>

  <StatusColumn status="COLLECTED">
    <OrderCard />
  </StatusColumn>

  <StatusColumn status="RECEIVED_AT_PLANT" disabled>
    <OrderCard /> {/* Read-only, can't change */}
  </StatusColumn>

  {/* ... other statuses */}

  <StatusColumn status="READY">
    <OrderCard selectable />
    <BulkActionButton>Mark as Delivered</BulkActionButton>
  </StatusColumn>
</OrderDashboard>
```

---

#### For PLANT_OPERATOR (Plant-based)

**Location:** `/plant/orders` or `/orders`

**View:** Orders assigned to their plant only

**Status Groups:**
- **Incoming**: RECEIVED_AT_PLANT
- **Active**: PROCESSING
- **Completed**: PROCESSED
- **Dispatched**: DISPATCHED

**Bulk Actions:**
- Select multiple RECEIVED_AT_PLANT orders → Mark as PROCESSING
- Select multiple PROCESSING orders → Mark as PROCESSED
- Select multiple PROCESSED orders → Mark as DISPATCHED

**UI:**
```jsx
<OrderDashboard role="PLANT_OPERATOR">
  <StatusColumn status="RECEIVED_AT_PLANT">
    <OrderCard selectable />
    <BulkActionButton>Start Processing</BulkActionButton>
  </StatusColumn>

  <StatusColumn status="PROCESSING">
    <OrderCard selectable />
    <BulkActionButton>Mark as Processed</BulkActionButton>
  </StatusColumn>

  <StatusColumn status="PROCESSED">
    <OrderCard selectable />
    <BulkActionButton>Dispatch to Pressing</BulkActionButton>
  </StatusColumn>

  <StatusColumn status="DISPATCHED">
    <OrderCard /> {/* Read-only */}
  </StatusColumn>
</OrderDashboard>
```

---

#### For ADMIN (All Orders)

**Location:** `/admin/orders` or `/orders`

**View:** All orders across all pressings and plants

**Filters:**
- By pressing
- By plant
- By status
- By date range

**Bulk Actions:** All status transitions allowed

---

### 3. Bulk Status Update Implementation

**Component:**
```jsx
function BulkStatusUpdate({ orderIds, currentStatus, userRole, userPressingId, userPlantId }) {
  const [selectedOrders, setSelectedOrders] = useState([]);

  const handleBulkUpdate = async (newStatus, plantId = null) => {
    try {
      const response = await apiClient.post('/api/orders/bulk-update-status', {
        orderIds: selectedOrders,
        newStatus: newStatus,
        plantId: plantId
      });

      // Update UI with response
      showToast(`${selectedOrders.length} orders updated to ${newStatus}`);
      refreshOrders();
      setSelectedOrders([]);
    } catch (error) {
      if (error.response.status === 403) {
        showToast('You do not have permission for some selected orders', 'error');
      } else {
        showToast('Failed to update orders', 'error');
      }
    }
  };

  return (
    <BulkActionPanel>
      <OrderSelectionList
        orders={orders}
        selectedIds={selectedOrders}
        onSelectionChange={setSelectedOrders}
      />

      {selectedOrders.length > 0 && (
        <ActionButtons>
          <Button onClick={() => handleBulkUpdate(getNextStatus())}>
            Move to {getNextStatus()}
          </Button>
        </ActionButtons>
      )}
    </BulkActionPanel>
  );
}
```

---

### 4. Plant Selector Component (Reusable)

**Use Cases:**
- Bulk updating orders to RECEIVED_AT_PLANT
- User creation form (ADMIN assigns plant to PLANT_OPERATOR)
- Order filtering

**Component:**
```jsx
<PlantSelect
  label="Plant"
  value={selectedPlantId}
  onChange={setSelectedPlantId}
  activeOnly={true} // Only show active plants
  required={false}
/>
```

---

### 5. Role-Specific UI Display

**Show/Hide Based on Role:**
```javascript
const { role, pressingId, plantId } = useAuth(); // From JWT

// Plant management (ADMIN only)
{role === 'ADMIN' && (
  <PlantManagementSection />
)}

// Order actions (role-specific)
{role === 'SUPERVISOR' && (
  <PressingOrderActions pressingId={pressingId} />
)}

{role === 'PLANT_OPERATOR' && (
  <PlantOrderActions plantId={plantId} />
)}

{role === 'ADMIN' && (
  <AllOrderActions />
)}
```

---

## State Management

### Add to Store/Context:

```javascript
{
  plants: {
    list: [],          // Array of PlantResponse
    current: null,     // Currently viewed/edited plant
    loading: false,
    error: null,
    filters: {
      activeOnly: true,
      search: ''
    }
  },
  orders: {
    list: [],
    selected: [],      // For bulk operations
    groupedByStatus: {
      CREATED: [],
      COLLECTED: [],
      RECEIVED_AT_PLANT: [],
      PROCESSING: [],
      PROCESSED: [],
      DISPATCHED: [],
      READY: [],
      DELIVERED: []
    },
    filters: {
      status: null,
      pressingId: null,
      plantId: null,
      dateRange: null
    }
  }
}
```

---

## Error Handling

### Bulk Update Errors

**403 Forbidden** - Permission denied for some orders
```javascript
if (error.response.status === 403) {
  showDialog({
    title: 'Permission Denied',
    message: 'You do not have permission to update some of the selected orders. Please review your selection.',
    variant: 'error'
  });
  // Optionally: highlight which orders failed
}
```

**400 Bad Request** - Invalid status or missing plant
```javascript
if (error.response.status === 400) {
  const errorData = error.response.data;
  if (errorData.message.includes('plant')) {
    showDialog({
      title: 'Plant Required',
      message: 'Please select a plant when marking orders as RECEIVED_AT_PLANT.',
      actions: [
        {
          label: 'Select Plant',
          onClick: () => openPlantSelector()
        }
      ]
    });
  }
}
```

---

## UI/UX Best Practices

### 1. Status Visualization

Use color-coded badges and icons:

| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| CREATED | Blue | 📝 | New order |
| COLLECTED | Purple | 🚚 | In transit to plant |
| RECEIVED_AT_PLANT | Orange | 📥 | Arrived at plant |
| PROCESSING | Yellow | ⚙️ | Being processed |
| PROCESSED | Light Green | ✅ | Processing complete |
| DISPATCHED | Purple | 🚚 | In transit to pressing |
| READY | Green | 🎁 | Ready for pickup |
| DELIVERED | Gray | ✔️ | Completed |

---

### 2. Bulk Selection UX

**Multi-Select Mode:**
- Checkbox on each order card
- "Select All" button per status column
- Clear selection button
- Show count: "15 orders selected"
- Disable invalid status transitions

**Keyboard Shortcuts:**
- `Ctrl/Cmd + A`: Select all in current view
- `Shift + Click`: Range select
- `Escape`: Clear selection

---

### 3. Order Movement Tracking

**Timeline View:**
```
CREATED (Jan 15, 9:00 AM)
  ↓
COLLECTED (Jan 15, 10:30 AM)
  ↓
RECEIVED_AT_PLANT (Jan 15, 11:45 AM)
  ↓
PROCESSING (Jan 15, 2:00 PM)
  ↓
PROCESSED (Jan 15, 4:30 PM)
  ↓
DISPATCHED (Jan 15, 5:00 PM)
  ↓
READY (Jan 16, 9:00 AM)
  ↓
DELIVERED (Jan 16, 3:00 PM) ← Current
```

---

### 4. Permission-Based UI

**Visual Indicators:**
- Disable buttons for unauthorized actions
- Show lock icon 🔒 on read-only items
- Display role badge on user profile
- Tooltip explaining why action is disabled

**Example:**
```jsx
<Button
  onClick={handleUpdate}
  disabled={!canUpdate}
  tooltip={!canUpdate ? "Only ADMIN can perform this action" : ""}
>
  Update Plant
</Button>
```

---

### 5. Bulk Action Confirmation

**Before executing bulk updates, show confirmation:**
```jsx
<ConfirmDialog
  title="Update 15 Orders?"
  message={`Are you sure you want to mark 15 orders as ${newStatus}?`}
  details={
    <ul>
      {selectedOrders.map(order => (
        <li key={order.id}>{order.referenceCode}</li>
      ))}
    </ul>
  }
  confirmText="Update"
  cancelText="Cancel"
  onConfirm={() => executeBulkUpdate()}
/>
```

---

## Testing Checklist

### Plant Management (ADMIN)
- ✅ Create new plant
- ✅ View all plants list
- ✅ Filter active/inactive plants
- ✅ Search plants by name
- ✅ Edit plant details
- ✅ Toggle plant active status
- ✅ Delete plant

### PLANT_OPERATOR Workflow
- ✅ Login as PLANT_OPERATOR → Receive plantId in JWT
- ✅ View only orders assigned to their plant
- ✅ Bulk select orders with status RECEIVED_AT_PLANT
- ✅ Bulk update to PROCESSING
- ✅ Bulk update PROCESSING → PROCESSED
- ✅ Bulk update PROCESSED → DISPATCHED
- ✅ Cannot update orders from other plants (403)

### SUPERVISOR Workflow
- ✅ Create orders (status: CREATED)
- ✅ Bulk select CREATED orders
- ✅ Bulk update to COLLECTED
- ✅ Cannot modify orders at plant statuses (PROCESSING, etc.)
- ✅ Bulk select READY orders
- ✅ Bulk update to DELIVERED
- ✅ Cannot access orders from other pressings (403)

### ADMIN Workflow
- ✅ View all orders across all pressings and plants
- ✅ Bulk update any orders to any status
- ✅ Assign plant when updating to RECEIVED_AT_PLANT
- ✅ Create PLANT_OPERATOR users assigned to plants
- ✅ Manage both plants and pressings

### Integration Testing
- ✅ Full order lifecycle: CREATED → DELIVERED
- ✅ Order moves from pressing → plant → pressing
- ✅ Plant assignment persists on order
- ✅ Bulk updates maintain data integrity
- ✅ Permission checks work correctly for all roles

---

## API Summary Table

| Endpoint | Method | Auth | ADMIN | SUPERVISOR | PLANT_OPERATOR |
|----------|--------|------|-------|------------|----------------|
| `/api/plants` | POST | ✅ | ✅ | ❌ | ❌ |
| `/api/plants` | GET | ✅ | ✅ | ✅ | ✅ |
| `/api/plants/{id}` | GET | ✅ | ✅ | ✅ | ✅ |
| `/api/plants/{id}` | PUT | ✅ | ✅ | ❌ | ❌ |
| `/api/plants/{id}` | DELETE | ✅ | ✅ | ❌ | ❌ |
| `/api/plants/{id}/toggle-active` | PATCH | ✅ | ✅ | ❌ | ❌ |
| `/api/orders/bulk-update-status` | POST | ✅ | ✅ | ✅* | ✅** |

*SUPERVISOR: Can only update orders from their pressing
**PLANT_OPERATOR: Can only update orders assigned to their plant

---

## Summary

**What's Implemented:**
- Plant (laundry facility) entity with full CRUD operations
- PLANT_OPERATOR role for plant staff
- 8-stage order workflow (CREATED → DELIVERED)
- Bulk order status update with permission checks
- Plant assignment to orders
- Enhanced JWT with plantId claim
- Role-based permissions for all operations

**Frontend Must Build:**
1. Plant management screen (ADMIN only)
2. Order workflow dashboard (role-specific views)
3. Bulk selection and update UI
4. Status timeline visualization
5. Plant selector component
6. Permission-based UI rendering
7. Multi-select with keyboard shortcuts
8. Confirmation dialogs for bulk actions

**Key Changes from Previous Version:**
- Order statuses expanded from 4 to 8
- Orders now include plantId and plantName
- Three distinct user roles with different permissions
- Bulk operations for efficient order processing
- Plant entity for managing processing facilities

---

## Migration Notes

If you have existing data:
1. Run Flyway migration V3 to update schema
2. Existing orders will have null plantId (valid state)
3. Plant assignment happens when orders reach RECEIVED_AT_PLANT status
4. Existing users remain ADMIN or SUPERVISOR (no migration needed)
5. Create plant records before creating PLANT_OPERATOR users
