# Frontend Guide: Corrected Order Workflow & Permissions

Complete implementation guide for the pressing-to-plant order workflow with strict role-based permissions and payment visibility control.

---

## Overview

This document describes the **correct workflow** for order processing between pressings (customer-facing locations) and plants (laundry processing facilities).

### Key Principles

1. **SUPERVISOR** creates and manages orders at pressing, but **cannot modify orders during plant processing**
2. **PLANT_OPERATOR** handles orders at plant, **does NOT see payment information**
3. **Orders move physically**: Pressing → Plant → Pressing
4. **Each role has specific status transitions they can perform**

---

## Complete Order Workflow

```
┌─────────────┐
│   CREATED   │ ← SUPERVISOR creates order at pressing
└──────┬──────┘
       │ SUPERVISOR: Mark as COLLECTED
       ↓
┌─────────────┐
│  COLLECTED  │ ← Driver picked up from pressing
└──────┬──────┘
       │ PLANT_OPERATOR: Accept and mark as RECEIVED_AT_PLANT
       ↓
┌─────────────────────┐
│ RECEIVED_AT_PLANT   │ ← Arrived at plant
└──────┬──────────────┘
       │ PLANT_OPERATOR: Start processing
       ↓
┌─────────────┐
│ PROCESSING  │ ← Being cleaned at plant
└──────┬──────┘
       │ PLANT_OPERATOR: Mark as complete
       ↓
┌─────────────┐
│  PROCESSED  │ ← Cleaning finished
└──────┬──────┘
       │ PLANT_OPERATOR: Dispatch back to pressing
       ↓
┌─────────────┐
│ DISPATCHED  │ ← Sent back to pressing
└──────┬──────┘
       │ SUPERVISOR: Confirm arrival and mark READY
       ↓
┌─────────────┐
│    READY    │ ← Back at pressing, available for client pickup
└──────┬──────┘
       │ SUPERVISOR: Mark as delivered to client
       ↓
┌─────────────┐
│  DELIVERED  │ ← Client received the order
└─────────────┘
```

---

## Role-Based Permissions Matrix

### Status Transition Permissions

| Current Status | Next Status | SUPERVISOR | PLANT_OPERATOR | ADMIN |
|---------------|-------------|------------|----------------|-------|
| CREATED | COLLECTED | ✅ | ❌ | ✅ |
| COLLECTED | RECEIVED_AT_PLANT | ❌ | ✅ | ✅ |
| RECEIVED_AT_PLANT | PROCESSING | ❌ | ✅ | ✅ |
| PROCESSING | PROCESSED | ❌ | ✅ | ✅ |
| PROCESSED | DISPATCHED | ❌ | ✅ | ✅ |
| DISPATCHED | READY | ✅ | ❌ | ✅ |
| READY | DELIVERED | ✅ | ❌ | ✅ |

### Order Visibility

| Status Range | SUPERVISOR View | PLANT_OPERATOR View | Payment Visible |
|-------------|----------------|---------------------|-----------------|
| CREATED, COLLECTED | ✅ Can modify | ❌ Cannot see | ✅ SUPERVISOR: Yes |
| RECEIVED_AT_PLANT → DISPATCHED | ✅ Read-only view | ✅ Can modify | ❌ PLANT_OPERATOR: No |
| DISPATCHED → DELIVERED | ✅ Can modify | ❌ Cannot see | ✅ SUPERVISOR: Yes |

**Important Rules:**
- SUPERVISOR sees ALL orders from their pressing (all statuses)
- SUPERVISOR can only MODIFY orders at pressing statuses (CREATED, DISPATCHED, READY)
- PLANT_OPERATOR sees ONLY orders assigned to their plant
- PLANT_OPERATOR NEVER sees payment information
- ADMIN sees and can modify everything

---

## API Endpoints

### 1. Get Orders for SUPERVISOR

**Endpoint:** `GET /api/orders/pressing/{pressingId}`
**Auth:** Required
**Permission:** ✅ SUPERVISOR (own pressing) | ✅ ADMIN

**Response Example:**
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
]
```

**Note:** SUPERVISOR sees payment information for all orders from their pressing.

---

### 2. Get Orders for PLANT_OPERATOR

**Endpoint:** `GET /api/orders/plant/{plantId}`
**Auth:** Required
**Permission:** ✅ PLANT_OPERATOR (own plant) | ✅ ADMIN

**Response Example:**
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
    "status": "PROCESSING",
    "items": [
      {
        "id": 30,
        "label": "Suit",
        "quantity": 1
      }
    ],
    "payment": null,
    "createdAt": "2024-01-15T09:00:00Z"
  }
]
```

**Note:** PLANT_OPERATOR does **NOT** see payment information (payment is always null).

---

### 3. Bulk Update Order Status

**Endpoint:** `POST /api/orders/bulk-update-status`
**Auth:** Required
**Permission:** ✅ ADMIN | ✅ SUPERVISOR* | ✅ PLANT_OPERATOR**

*SUPERVISOR: Can only update orders from their pressing
**PLANT_OPERATOR: Can only update orders at their plant

**Request Body:**
```json
{
  "orderIds": [15, 16, 17],
  "newStatus": "PROCESSING",
  "plantId": 1
}
```

**Field Notes:**
- `orderIds`: List of order IDs to update
- `newStatus`: Target status (must be valid for user's role)
- `plantId`: Required when PLANT_OPERATOR updates to RECEIVED_AT_PLANT

**Success Response (200 OK):**
```json
[
  {
    "id": 15,
    "referenceCode": "P1-20240115-0001",
    "status": "PROCESSING",
    ...
  }
]
```

**Error Responses:**
- `400 Bad Request`: Invalid status transition
  - Example: SUPERVISOR trying to mark CREATED → PROCESSING (skipping COLLECTED)
  - Example: PLANT_OPERATOR trying to mark PROCESSING → CREATED (invalid transition)
- `403 Forbidden`: User doesn't have permission
  - Example: SUPERVISOR trying to update RECEIVED_AT_PLANT → PROCESSING
  - Example: PLANT_OPERATOR trying to update CREATED → COLLECTED
- `404 Not Found`: Some order IDs not found

---

## Frontend Implementation

### 1. SUPERVISOR Dashboard

**Location:** `/orders` or `/pressing/orders`

**View Structure:**

```jsx
<SupervisorDashboard pressingId={userPressingId}>
  <Tabs>
    {/* Tab 1: Orders at Pressing (Can Modify) */}
    <Tab label="At Pressing" badge={atPressingCount}>
      <StatusSection status="CREATED">
        <OrderCard selectable showPayment />
        <BulkActionButton
          action="COLLECTED"
          label="Mark as Collected"
          enabled={hasSelected}
        />
      </StatusSection>

      <StatusSection status="READY">
        <OrderCard selectable showPayment />
        <BulkActionButton
          action="DELIVERED"
          label="Mark as Delivered"
          enabled={hasSelected}
        />
      </StatusSection>
    </Tab>

    {/* Tab 2: In Transit (Read-only) */}
    <Tab label="In Transit" badge={inTransitCount}>
      <StatusSection status="COLLECTED" readOnly>
        <OrderCard showPayment />
        <InfoBadge>Waiting to be received at plant</InfoBadge>
      </StatusSection>

      <StatusSection status="DISPATCHED" readOnly>
        <OrderCard selectable showPayment />
        <BulkActionButton
          action="READY"
          label="Mark as Ready for Pickup"
          enabled={hasSelected}
        />
      </StatusSection>
    </Tab>

    {/* Tab 3: At Plant (Read-only) */}
    <Tab label="At Plant" badge={atPlantCount}>
      <StatusSection status="RECEIVED_AT_PLANT" readOnly>
        <OrderCard showPayment />
        <InfoBadge>Being processed at plant</InfoBadge>
      </StatusSection>

      <StatusSection status="PROCESSING" readOnly>
        <OrderCard showPayment />
        <InfoBadge>Currently being processed</InfoBadge>
      </StatusSection>

      <StatusSection status="PROCESSED" readOnly>
        <OrderCard showPayment />
        <InfoBadge>Processing complete, waiting dispatch</InfoBadge>
      </StatusSection>
    </Tab>

    {/* Tab 4: Completed */}
    <Tab label="Completed" badge={completedCount}>
      <StatusSection status="DELIVERED" readOnly>
        <OrderCard showPayment />
      </StatusSection>
    </Tab>
  </Tabs>
</SupervisorDashboard>
```

**Key Features:**
- ✅ See all orders from their pressing (all statuses)
- ✅ See payment information for all orders
- ✅ Can modify orders at CREATED, DISPATCHED, READY statuses
- ✅ **Read-only view** of orders at plant (RECEIVED_AT_PLANT → PROCESSED)
- ✅ Visual indicators showing which orders can be modified vs read-only

---

### 2. PLANT_OPERATOR Dashboard

**Location:** `/plant/orders` or `/orders`

**View Structure:**

```jsx
<PlantOperatorDashboard plantId={userPlantId}>
  <Tabs>
    {/* Tab 1: Incoming Orders */}
    <Tab label="Incoming" badge={incomingCount}>
      <StatusSection status="COLLECTED">
        <OrderCard selectable hidePayment />
        <BulkActionButton
          action="RECEIVED_AT_PLANT"
          label="Accept at Plant"
          enabled={hasSelected}
          requiresPlant={userPlantId}
        />
      </StatusSection>
    </Tab>

    {/* Tab 2: Active Processing */}
    <Tab label="Processing" badge={processingCount}>
      <StatusSection status="RECEIVED_AT_PLANT">
        <OrderCard selectable hidePayment />
        <BulkActionButton
          action="PROCESSING"
          label="Start Processing"
          enabled={hasSelected}
        />
      </StatusSection>

      <StatusSection status="PROCESSING">
        <OrderCard selectable hidePayment />
        <BulkActionButton
          action="PROCESSED"
          label="Mark as Complete"
          enabled={hasSelected}
        />
      </StatusSection>
    </Tab>

    {/* Tab 3: Ready to Dispatch */}
    <Tab label="Ready to Dispatch" badge={readyCount}>
      <StatusSection status="PROCESSED">
        <OrderCard selectable hidePayment />
        <BulkActionButton
          action="DISPATCHED"
          label="Dispatch to Pressing"
          enabled={hasSelected}
        />
      </StatusSection>
    </Tab>

    {/* Tab 4: Dispatched (History) */}
    <Tab label="Dispatched" badge={dispatchedCount}>
      <StatusSection status="DISPATCHED" readOnly>
        <OrderCard hidePayment />
        <InfoBadge>On the way back to pressing</InfoBadge>
      </StatusSection>
    </Tab>
  </Tabs>
</PlantOperatorDashboard>
```

**Key Features:**
- ✅ See only orders assigned to their plant
- ❌ **NEVER see payment information** (payment is always hidden)
- ✅ Can accept COLLECTED orders and assign to their plant
- ✅ Can update orders through all plant statuses
- ✅ View dispatched orders as history

---

### 3. OrderCard Component

**Two Variants: With and Without Payment**

```jsx
// Variant 1: With Payment (for SUPERVISOR and ADMIN)
function OrderCardWithPayment({ order, selectable, onSelect }) {
  return (
    <Card>
      {selectable && <Checkbox onChange={() => onSelect(order.id)} />}

      <OrderHeader>
        <ReferenceCode>{order.referenceCode}</ReferenceCode>
        <StatusBadge status={order.status} />
      </OrderHeader>

      <OrderDetails>
        <Client>{order.clientName}</Client>
        <Plant>{order.plantName || 'Not assigned'}</Plant>
        <Items>
          {order.items.map(item => (
            <ItemTag key={item.id}>{item.label} x{item.quantity}</ItemTag>
          ))}
        </Items>
      </OrderDetails>

      {/* Payment Section - Visible */}
      <PaymentSection>
        <Amount>${order.payment.amount}</Amount>
        <Method>{order.payment.method}</Method>
        <PaymentStatus status={order.payment.status}>
          {order.payment.status}
        </PaymentStatus>
      </PaymentSection>

      <Timestamp>{formatDate(order.createdAt)}</Timestamp>
    </Card>
  );
}

// Variant 2: Without Payment (for PLANT_OPERATOR)
function OrderCardWithoutPayment({ order, selectable, onSelect }) {
  return (
    <Card>
      {selectable && <Checkbox onChange={() => onSelect(order.id)} />}

      <OrderHeader>
        <ReferenceCode>{order.referenceCode}</ReferenceCode>
        <StatusBadge status={order.status} />
      </OrderHeader>

      <OrderDetails>
        <Client>{order.clientName}</Client>
        <Pressing>{order.pressingName}</Pressing>
        <Items>
          {order.items.map(item => (
            <ItemTag key={item.id}>{item.label} x{item.quantity}</ItemTag>
          ))}
        </Items>
      </OrderDetails>

      {/* NO Payment Section */}

      <Timestamp>{formatDate(order.createdAt)}</Timestamp>
    </Card>
  );
}

// Usage
function OrderCard({ order, role, ...props }) {
  const showPayment = role !== 'PLANT_OPERATOR';

  return showPayment ? (
    <OrderCardWithPayment order={order} {...props} />
  ) : (
    <OrderCardWithoutPayment order={order} {...props} />
  );
}
```

---

### 4. Bulk Status Update Implementation

```jsx
function BulkStatusUpdate({ selectedOrders, currentStatus, newStatus, userRole, userPressingId, userPlantId }) {

  const validateTransition = () => {
    // Client-side validation before API call
    if (userRole === 'SUPERVISOR') {
      // SUPERVISOR can only do these transitions
      if (newStatus === 'COLLECTED' && currentStatus !== 'CREATED') {
        return false;
      }
      if (newStatus === 'READY' && currentStatus !== 'DISPATCHED') {
        return false;
      }
      if (newStatus === 'DELIVERED' && currentStatus !== 'READY') {
        return false;
      }
      // SUPERVISOR cannot set other statuses
      if (!['COLLECTED', 'READY', 'DELIVERED'].includes(newStatus)) {
        return false;
      }
    } else if (userRole === 'PLANT_OPERATOR') {
      // PLANT_OPERATOR can only do these transitions
      if (newStatus === 'RECEIVED_AT_PLANT' && currentStatus !== 'COLLECTED') {
        return false;
      }
      if (newStatus === 'PROCESSING' && currentStatus !== 'RECEIVED_AT_PLANT') {
        return false;
      }
      if (newStatus === 'PROCESSED' && currentStatus !== 'PROCESSING') {
        return false;
      }
      if (newStatus === 'DISPATCHED' && currentStatus !== 'PROCESSED') {
        return false;
      }
      // PLANT_OPERATOR cannot set other statuses
      if (!['RECEIVED_AT_PLANT', 'PROCESSING', 'PROCESSED', 'DISPATCHED'].includes(newStatus)) {
        return false;
      }
    }
    return true;
  };

  const handleBulkUpdate = async () => {
    if (!validateTransition()) {
      showToast('Invalid status transition for your role', 'error');
      return;
    }

    try {
      const payload = {
        orderIds: selectedOrders,
        newStatus: newStatus,
        plantId: newStatus === 'RECEIVED_AT_PLANT' ? userPlantId : null
      };

      const response = await apiClient.post('/api/orders/bulk-update-status', payload);

      showToast(`${selectedOrders.length} orders updated to ${newStatus}`, 'success');
      refreshOrders();
      clearSelection();
    } catch (error) {
      if (error.response?.status === 403) {
        showToast('You do not have permission for this action', 'error');
      } else if (error.response?.status === 400) {
        showToast('Invalid status transition', 'error');
      } else {
        showToast('Failed to update orders', 'error');
      }
    }
  };

  return (
    <BulkActionButton onClick={handleBulkUpdate}>
      Update to {newStatus}
    </BulkActionButton>
  );
}
```

---

### 5. Read-Only Status Indicators

When SUPERVISOR views orders at plant statuses, show clear read-only indicators:

```jsx
function StatusSection({ status, readOnly, children }) {
  return (
    <Section className={readOnly ? 'read-only' : ''}>
      <SectionHeader>
        <StatusName>{status}</StatusName>
        {readOnly && (
          <ReadOnlyBadge>
            🔒 Read-Only (Processing at Plant)
          </ReadOnlyBadge>
        )}
      </SectionHeader>

      <SectionContent disabled={readOnly}>
        {children}
      </SectionContent>

      {readOnly && (
        <InfoMessage>
          These orders are being processed at the plant. You'll be able to update them when they return to your pressing.
        </InfoMessage>
      )}
    </Section>
  );
}
```

---

## Error Handling

### Status Transition Errors

**400 Bad Request - Invalid Transition:**
```jsx
if (error.response.status === 400) {
  showDialog({
    title: 'Invalid Status Transition',
    message: 'The selected orders cannot be moved to this status. Please check the current status and try again.',
    variant: 'error',
    actions: [
      { label: 'View Workflow', onClick: () => showWorkflowGuide() },
      { label: 'OK' }
    ]
  });
}
```

**403 Forbidden - Permission Denied:**
```jsx
if (error.response.status === 403) {
  const message = userRole === 'SUPERVISOR'
    ? 'You can only modify orders at your pressing. Orders being processed at the plant are read-only.'
    : 'You can only modify orders assigned to your plant.';

  showDialog({
    title: 'Permission Denied',
    message: message,
    variant: 'error'
  });
}
```

---

## UI/UX Best Practices

### 1. Visual Status Indicators

```jsx
const statusColors = {
  CREATED: { bg: '#E3F2FD', text: '#1976D2', icon: '📝' },
  COLLECTED: { bg: '#F3E5F5', text: '#7B1FA2', icon: '🚚' },
  RECEIVED_AT_PLANT: { bg: '#FFF3E0', text: '#E65100', icon: '📥' },
  PROCESSING: { bg: '#FFF9C4', text: '#F57F17', icon: '⚙️' },
  PROCESSED: { bg: '#E8F5E9', text: '#388E3C', icon: '✅' },
  DISPATCHED: { bg: '#F3E5F5', text: '#7B1FA2', icon: '🚚' },
  READY: { bg: '#C8E6C9', text: '#2E7D32', icon: '🎁' },
  DELIVERED: { bg: '#F5F5F5', text: '#616161', icon: '✔️' }
};

function StatusBadge({ status }) {
  const config = statusColors[status];

  return (
    <Badge style={{ backgroundColor: config.bg, color: config.text }}>
      <span>{config.icon}</span>
      <span>{status.replace(/_/g, ' ')}</span>
    </Badge>
  );
}
```

---

### 2. Workflow Education

**Show workflow guide to users:**

```jsx
function WorkflowGuide({ userRole }) {
  const roleSteps = {
    SUPERVISOR: [
      { status: 'CREATED', action: 'Create order', canModify: true },
      { status: 'COLLECTED', action: 'Mark as collected', canModify: true },
      { status: 'RECEIVED_AT_PLANT', action: '(Plant receives)', canModify: false },
      { status: 'PROCESSING', action: '(Plant processes)', canModify: false },
      { status: 'PROCESSED', action: '(Plant completes)', canModify: false },
      { status: 'DISPATCHED', action: '(Plant dispatches)', canModify: false },
      { status: 'READY', action: 'Mark as ready', canModify: true },
      { status: 'DELIVERED', action: 'Mark as delivered', canModify: true }
    ],
    PLANT_OPERATOR: [
      { status: 'COLLECTED', action: '(Pressed collects)', canModify: false },
      { status: 'RECEIVED_AT_PLANT', action: 'Accept at plant', canModify: true },
      { status: 'PROCESSING', action: 'Start processing', canModify: true },
      { status: 'PROCESSED', action: 'Mark complete', canModify: true },
      { status: 'DISPATCHED', action: 'Dispatch to pressing', canModify: true },
      { status: 'READY', action: '(Pressing receives)', canModify: false },
      { status: 'DELIVERED', action: '(Pressing delivers)', canModify: false }
    ]
  };

  return (
    <Modal>
      <ModalTitle>Order Workflow for {userRole}</ModalTitle>
      <Timeline>
        {roleSteps[userRole].map((step, index) => (
          <TimelineItem key={index} canModify={step.canModify}>
            <StatusBadge status={step.status} />
            <Action>
              {step.action}
              {step.canModify && <Badge color="green">You can modify</Badge>}
              {!step.canModify && <Badge color="gray">Read-only</Badge>}
            </Action>
          </TimelineItem>
        ))}
      </Timeline>
    </Modal>
  );
}
```

---

### 3. Payment Visibility Control

**IMPORTANT: Never send payment data to PLANT_OPERATOR clients**

Backend already handles this, but frontend should also respect it:

```jsx
function useOrders(role, locationId) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const endpoint = role === 'PLANT_OPERATOR'
      ? `/api/orders/plant/${locationId}`
      : `/api/orders/pressing/${locationId}`;

    apiClient.get(endpoint).then(response => {
      setOrders(response.data);

      // Verify payment is null for PLANT_OPERATOR (safety check)
      if (role === 'PLANT_OPERATOR') {
        response.data.forEach(order => {
          if (order.payment !== null) {
            console.error('SECURITY: Payment data exposed to PLANT_OPERATOR!');
          }
        });
      }
    });
  }, [role, locationId]);

  return orders;
}
```

---

## Testing Checklist

### SUPERVISOR Workflow
- ✅ Create new order (status: CREATED)
- ✅ Select multiple CREATED orders → Mark as COLLECTED
- ✅ View orders with status COLLECTED (read-only, waiting for plant)
- ✅ View orders at plant (RECEIVED_AT_PLANT, PROCESSING, PROCESSED) - read-only, see payment
- ✅ Try to update PROCESSING → PROCESSED (should fail with 403)
- ✅ Select multiple DISPATCHED orders → Mark as READY
- ✅ Select multiple READY orders → Mark as DELIVERED
- ✅ Confirm payment information is visible for all orders

### PLANT_OPERATOR Workflow
- ✅ Login as PLANT_OPERATOR → Receive plantId in JWT
- ✅ View only COLLECTED orders (incoming)
- ✅ Select multiple COLLECTED orders → Mark as RECEIVED_AT_PLANT (assigns to plant)
- ✅ Select multiple RECEIVED_AT_PLANT orders → Mark as PROCESSING
- ✅ Select multiple PROCESSING orders → Mark as PROCESSED
- ✅ Select multiple PROCESSED orders → Mark as DISPATCHED
- ✅ Confirm payment information is NOT visible for any orders
- ✅ Try to update CREATED → COLLECTED (should fail with 403)
- ✅ Try to update READY → DELIVERED (should fail with 403)

### Permission Validation
- ✅ SUPERVISOR cannot modify orders during plant processing
- ✅ PLANT_OPERATOR cannot modify orders at pressing statuses
- ✅ Invalid transitions return 400 error
- ✅ Cross-location access returns 403 error
- ✅ Payment data never sent to PLANT_OPERATOR

---

## API Summary Table

| Endpoint | Method | SUPERVISOR | PLANT_OPERATOR | Payment Visible |
|----------|--------|------------|----------------|-----------------|
| `/api/orders/pressing/{id}` | GET | ✅ Own pressing | ❌ | ✅ |
| `/api/orders/plant/{id}` | GET | ❌* | ✅ Own plant | ❌ |
| `/api/orders/bulk-update-status` | POST | ✅** | ✅*** | N/A |

*SUPERVISOR doesn't use this endpoint (uses pressing endpoint instead)
**SUPERVISOR can only update: CREATED→COLLECTED, DISPATCHED→READY, READY→DELIVERED
***PLANT_OPERATOR can only update: COLLECTED→RECEIVED_AT_PLANT, RECEIVED_AT_PLANT→PROCESSING, PROCESSING→PROCESSED, PROCESSED→DISPATCHED

---

## Summary

**Key Implementation Points:**

1. **Workflow Separation:**
   - SUPERVISOR handles pressing-side operations (create, collect, ready, deliver)
   - PLANT_OPERATOR handles plant-side operations (receive, process, dispatch)
   - Clear handoff points: COLLECTED → (plant accepts), DISPATCHED → (pressing receives)

2. **Payment Security:**
   - Backend: OrderService hides payment for PLANT_OPERATOR
   - Frontend: Use separate endpoints, never display payment fields for PLANT_OPERATOR
   - Verify: payment field is always null in PLANT_OPERATOR responses

3. **Read-Only Views:**
   - SUPERVISOR sees orders at plant but cannot modify them
   - Clear visual indicators (lock icons, badges, disabled buttons)
   - Educational messages explaining why orders are read-only

4. **Status Validation:**
   - Client-side: Validate before API call for better UX
   - Server-side: Strict validation prevents invalid transitions
   - Clear error messages guide users to correct workflow

5. **User Experience:**
   - Role-specific dashboards with relevant tabs
   - Bulk operations with clear visual feedback
   - Workflow education and help guides
   - Status badges with colors and icons

This workflow ensures **secure**, **clear**, and **efficient** order processing across multiple locations with proper role separation!
