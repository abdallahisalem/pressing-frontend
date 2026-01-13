# Frontend Guide: Pressing Management

Complete API documentation and UI guidelines for implementing pressing (business location) management in the frontend.

---

## Overview

**Pressings** represent physical business locations (e.g., "Downtown Branch", "Airport Location"). Each pressing has:
- Unique name
- Optional address
- Active/inactive status
- Associated users, clients, and orders

**Permission Model:**
- **ADMIN**: Full CRUD access to all pressings
- **SUPERVISOR**: Read-only access, cannot create/modify/delete

---

## API Endpoints

### 1. Create Pressing (ADMIN Only)
**Endpoint:** `POST /api/pressings`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR

**Request Body:**
```json
{
  "name": "Downtown Branch",
  "address": "123 Main Street, City, State",
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
  "name": "Downtown Branch",
  "address": "123 Main Street, City, State",
  "active": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Name is required or duplicate name
- `403 Forbidden`: User is not ADMIN

---

### 2. Get All Pressings
**Endpoint:** `GET /api/pressings?activeOnly={boolean}`
**Auth:** Required
**Permission:** ✅ ADMIN | ✅ SUPERVISOR

**Query Parameters:**
- `activeOnly`: Optional boolean
  - `true` - Returns only active pressings
  - `false` or omitted - Returns all pressings

**Examples:**
- `GET /api/pressings` - All pressings
- `GET /api/pressings?activeOnly=true` - Only active pressings

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Main Pressing",
    "address": "123 Main St",
    "active": true,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z"
  },
  {
    "id": 2,
    "name": "Downtown Branch",
    "address": "123 Main Street, City, State",
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### 3. Get Pressing by ID
**Endpoint:** `GET /api/pressings/{id}`
**Auth:** Required
**Permission:** ✅ ADMIN | ✅ SUPERVISOR

**Example:** `GET /api/pressings/1`

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Main Pressing",
  "address": "123 Main St",
  "active": true,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-10T08:00:00Z"
}
```

**Error Response:**
- `404 Not Found`: Pressing not found

---

### 4. Update Pressing (ADMIN Only)
**Endpoint:** `PUT /api/pressings/{id}`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR

**Request Body (all fields optional):**
```json
{
  "name": "Downtown Branch - Updated",
  "address": "456 New Street, City, State",
  "active": false
}
```

**Note:** Only include fields you want to update. Omitted fields remain unchanged.

**Success Response (200 OK):**
```json
{
  "id": 2,
  "name": "Downtown Branch - Updated",
  "address": "456 New Street, City, State",
  "active": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:45:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid data or duplicate name
- `403 Forbidden`: User is not ADMIN
- `404 Not Found`: Pressing not found

---

### 5. Delete Pressing (ADMIN Only)
**Endpoint:** `DELETE /api/pressings/{id}`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR

**Example:** `DELETE /api/pressings/2`

**Success Response (204 No Content):** Empty body

**Error Responses:**
- `403 Forbidden`: User is not ADMIN
- `404 Not Found`: Pressing not found
- `409 Conflict`: Pressing has associated data (users, clients, orders)

**⚠️ Warning:** Deleting a pressing will cascade delete:
- All associated users
- All associated clients
- All associated orders and payments

**Recommendation:** Instead of deleting, use "deactivate" (set `active: false`)

---

### 6. Toggle Active Status (ADMIN Only)
**Endpoint:** `PATCH /api/pressings/{id}/toggle-active`
**Auth:** Required (ADMIN only)
**Permission:** ✅ ADMIN | ❌ SUPERVISOR

**Example:** `PATCH /api/pressings/2/toggle-active`

**Action:** Flips the `active` status (true → false or false → true)

**Success Response (200 OK):**
```json
{
  "id": 2,
  "name": "Downtown Branch",
  "address": "123 Main Street, City, State",
  "active": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Use Case:** Quick enable/disable without updating other fields

---

## Frontend Implementation Guide

### 1. Pressing List Screen (ADMIN & SUPERVISOR)
**Location:** `/pressings` or `/admin/pressings`

**Features:**
- Display all pressings in a table/grid
- Show: Name, Address, Status (Active/Inactive), Created Date
- Filter: Active only / All
- Search: By name or address
- Actions (ADMIN only):
  - Create new pressing button
  - Edit button per row
  - Delete button per row (with confirmation)
  - Toggle active/inactive button

**UI Components:**
```jsx
<PressingList>
  <Toolbar>
    <CreateButton /> {/* ADMIN only */}
    <SearchBar placeholder="Search pressings..." />
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
</PressingList>
```

**Status Badge:**
- **Active**: Green background, "Active" text
- **Inactive**: Gray background, "Inactive" text

---

### 2. Create Pressing Modal/Form (ADMIN Only)
**Trigger:** "Create Pressing" button on list screen

**Form Fields:**
```jsx
<CreatePressingForm>
  <Input
    label="Pressing Name *"
    name="name"
    required
    placeholder="e.g., Downtown Branch"
    maxLength={255}
  />

  <TextArea
    label="Address"
    name="address"
    placeholder="Full address (optional)"
    rows={3}
  />

  <Checkbox
    label="Active"
    name="active"
    defaultChecked={true}
    helperText="Active pressings appear in dropdowns"
  />

  <Actions>
    <CancelButton />
    <SubmitButton>Create Pressing</SubmitButton>
  </Actions>
</CreatePressingForm>
```

**Validation:**
- Name: Required, non-empty
- Show error if name already exists (from 400 response)

**Success Flow:**
- Show success message: "Pressing created successfully"
- Close modal
- Refresh pressing list
- Optionally navigate to pressing details

---

### 3. Edit Pressing Modal/Form (ADMIN Only)
**Trigger:** "Edit" button on pressing row

**Form:** Same as create form but:
- Pre-filled with existing data
- Submit button: "Update Pressing"

**Partial Update:**
- Only send fields that changed
- Or send all fields (backend handles it)

**Success Flow:**
- Show success message: "Pressing updated successfully"
- Close modal
- Refresh pressing list

---

### 4. Delete Pressing Confirmation (ADMIN Only)
**Trigger:** "Delete" button on pressing row

**Confirmation Dialog:**
```jsx
<ConfirmDialog
  title="Delete Pressing?"
  message={`Are you sure you want to delete "${pressingName}"? This will also delete all associated users, clients, and orders. This action cannot be undone.`}
  variant="danger"
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={() => deletePressing(id)}
/>
```

**⚠️ Warning Text:**
- Emphasize cascade deletion
- Suggest deactivating instead of deleting

**Alternative Approach:**
- Instead of showing delete, show "Deactivate" button
- Only show delete for pressings with no associated data

**Success Flow:**
- Show success message: "Pressing deleted successfully"
- Remove row from list

---

### 5. Toggle Active Status (ADMIN Only)
**Trigger:** Toggle switch or button on pressing row

**UI:**
```jsx
<Switch
  checked={pressing.active}
  onChange={() => toggleActiveStatus(pressing.id)}
  label={pressing.active ? 'Active' : 'Inactive'}
/>
```

**Alternative:** Icon button with tooltip
- Active: Green checkmark icon → Click to deactivate
- Inactive: Gray X icon → Click to activate

**Success Flow:**
- Update row status badge immediately (optimistic update)
- Show toast: "Pressing activated" or "Pressing deactivated"

---

### 6. Pressing Selector Component (Reusable)
**Use Cases:**
- User creation form (ADMIN selects pressing for new user)
- Client creation form
- Order creation form

**Component:**
```jsx
<PressingSelect
  label="Pressing"
  value={selectedPressingId}
  onChange={setSelectedPressingId}
  activeOnly={true} // Only show active pressings
  disabled={role === 'SUPERVISOR'} // Auto-filled for SUPERVISOR
  required={true}
/>
```

**For SUPERVISOR:**
- Auto-fill with user's pressing from JWT
- Make field read-only/disabled
- Display pressing name only

**For ADMIN:**
- Show dropdown with all active pressings
- Allow selection

---

## State Management

### Add to Store/Context:
```javascript
{
  pressings: {
    list: [],          // Array of PressingResponse
    current: null,     // Currently viewed/edited pressing
    loading: false,
    error: null,
    filters: {
      activeOnly: true,
      search: ''
    }
  }
}
```

### Actions:
```javascript
// Fetch all pressings (with optional filter)
const fetchPressings = async (activeOnly = false) => {
  const response = await apiClient.get('/api/pressings', {
    params: { activeOnly }
  });
  return response.data;
};

// Create pressing (ADMIN)
const createPressing = async (data) => {
  const response = await apiClient.post('/api/pressings', data);
  return response.data;
};

// Update pressing (ADMIN)
const updatePressing = async (id, data) => {
  const response = await apiClient.put(`/api/pressings/${id}`, data);
  return response.data;
};

// Delete pressing (ADMIN)
const deletePressing = async (id) => {
  await apiClient.delete(`/api/pressings/${id}`);
};

// Toggle active status (ADMIN)
const togglePressingActive = async (id) => {
  const response = await apiClient.patch(`/api/pressings/${id}/toggle-active`);
  return response.data;
};
```

---

## Permission Handling

### Show/Hide UI Based on Role:
```javascript
const { role } = useAuth(); // From JWT

{role === 'ADMIN' && (
  <>
    <CreatePressingButton />
    <EditButton />
    <DeleteButton />
    <ToggleActiveButton />
  </>
)}
```

### For SUPERVISOR:
- Show list of pressings (read-only)
- No create/edit/delete actions
- Use pressing selector to view their own pressing details

---

## Error Handling

### Common Errors:

**400 Bad Request** - Duplicate name or validation error
```javascript
if (error.response.status === 400) {
  // Show validation errors
  const errors = error.response.data;
  if (errors.name) {
    setFieldError('name', errors.name);
  }
}
```

**403 Forbidden** - SUPERVISOR trying ADMIN action
```javascript
if (error.response.status === 403) {
  showToast('You do not have permission to perform this action', 'error');
}
```

**404 Not Found** - Pressing doesn't exist
```javascript
if (error.response.status === 404) {
  showToast('Pressing not found', 'error');
  navigateToList();
}
```

**409 Conflict** - Cannot delete pressing with associated data
```javascript
if (error.response.status === 409) {
  showDialog({
    title: 'Cannot Delete Pressing',
    message: 'This pressing has associated users, clients, or orders. Please deactivate it instead.',
    actions: [
      { label: 'Deactivate', onClick: () => toggleActive(id) },
      { label: 'Cancel' }
    ]
  });
}
```

---

## UI/UX Best Practices

### 1. Active Status Visualization
- **Active**: Green badge/indicator, appears in dropdowns
- **Inactive**: Gray badge, hidden from dropdowns (unless "Show All")

### 2. Deletion Warning
- Always show clear warning about cascade deletion
- Recommend deactivation over deletion
- Consider disabling delete button for pressings with data

### 3. Search & Filter
- Allow searching by name or address
- Default filter: "Active Only" for cleaner UX
- Toggle to show all (including inactive)

### 4. Quick Actions
- Inline edit icon for quick edits
- Toggle switch for quick activate/deactivate
- Confirmation only for destructive actions (delete)

### 5. Empty States
- No pressings: "No pressings found. Create your first pressing to get started."
- No search results: "No pressings match your search."

---

## Testing Checklist

### ADMIN Testing
- ✅ Create new pressing with all fields
- ✅ Create pressing with name only (address optional)
- ✅ Try creating pressing with duplicate name (should fail with 400)
- ✅ View all pressings list
- ✅ Filter active only vs all
- ✅ Search pressings by name
- ✅ Edit pressing - change name, address, active status
- ✅ Toggle active status using PATCH endpoint
- ✅ Delete pressing without associated data
- ✅ Try deleting pressing with users/orders (should fail with 409)

### SUPERVISOR Testing
- ✅ View pressings list (read-only)
- ✅ Cannot see create button
- ✅ Cannot see edit/delete actions
- ✅ Can view pressing details

### Integration Testing
- ✅ Create pressing → Create user for that pressing
- ✅ Create pressing → Create client for that pressing
- ✅ Create pressing → Create order for that pressing
- ✅ Deactivate pressing → Verify it's hidden in dropdowns
- ✅ Activate pressing → Verify it appears in dropdowns

---

## Screen Mockups

### Pressing List Table
```
╔════════════════════════════════════════════════════════════════╗
║  Pressings                                    [+ Create]  [🔍] ║
╠════════════════════════════════════════════════════════════════╣
║  Filter: [All] [Active Only]                                  ║
╠═══════════╦═══════════════════╦══════════╦══════════╦═════════╣
║ Name      ║ Address           ║ Status   ║ Created  ║ Actions ║
╠═══════════╬═══════════════════╬══════════╬══════════╬═════════╣
║ Main      ║ 123 Main St       ║ [Active] ║ Jan 10   ║ [✏️][🗑️] ║
║ Pressing  ║                   ║          ║          ║         ║
╠═══════════╬═══════════════════╬══════════╬══════════╬═════════╣
║ Downtown  ║ 456 Oak Ave       ║[Inactive]║ Jan 15   ║ [✏️][🗑️] ║
║ Branch    ║                   ║          ║          ║         ║
╚═══════════╩═══════════════════╩══════════╩══════════╩═════════╝
```

### Create/Edit Form Modal
```
╔════════════════════════════════════════╗
║  Create Pressing               [✕]     ║
╠════════════════════════════════════════╣
║                                        ║
║  Pressing Name *                       ║
║  [____________________________]        ║
║                                        ║
║  Address                               ║
║  [____________________________]        ║
║  [____________________________]        ║
║  [____________________________]        ║
║                                        ║
║  [✓] Active                            ║
║                                        ║
║  [ Cancel ]  [ Create Pressing ]       ║
╚════════════════════════════════════════╝
```

---

## Summary

**What's Implemented:**
- Full CRUD for pressing management (ADMIN only)
- Read-only list view for SUPERVISOR
- Toggle active/inactive status
- Filter pressings (active only vs all)
- Cascade deletion (with warning)

**Frontend Must Build:**
1. Pressing list table with status badges
2. Create pressing form (ADMIN)
3. Edit pressing form (ADMIN)
4. Delete confirmation dialog (ADMIN)
5. Toggle active switch/button (ADMIN)
6. Pressing selector component (reusable)
7. Search and filter functionality

**Key Points:**
- ADMIN has full control over pressings
- SUPERVISOR can only view pressings
- Active status controls visibility in dropdowns
- Deletion cascades to all related entities
- Recommend deactivation over deletion for safety
