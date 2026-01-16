# Final Workflow: Pressing-to-Plant with Status History

Complete implementation guide for the corrected order workflow with status history tracking.

---

## Corrected Workflow Understanding

### The Real Flow

1. **SUPERVISOR** creates orders at their pressing → **CREATED**
2. **Driver** picks up orders → **SUPERVISOR** marks them as **COLLECTED**
3. **COLLECTED orders are visible to ALL plant operators** (driver hasn't arrived at any specific plant yet)
4. **PLANT_OPERATOR** at their plant receives the orders → Marks as **RECEIVED_AT_PLANT** (assigns to their plant)
5. **Only that plant operator** sees the orders during **PROCESSING** → **PROCESSED**
6. **SUPERVISOR sees them as read-only** while at plant (to track progress)
7. **PLANT_OPERATOR** dispatches back → **DISPATCHED**
8. **Driver arrives at pressing** → **SUPERVISOR** marks as **READY**
9. **Client picks up** → **SUPERVISOR** marks as **DELIVERED**

### Status History

**Every status change is recorded with:**
- Status name
- Who changed it (user ID and name)
- When it was changed (timestamp)

This gives you a complete audit trail of the order's journey.

---

## Complete Order Workflow

```
┌─────────────┐
│   CREATED   │ ← SUPERVISOR creates at pressing
└──────┬──────┘
       │ SUPERVISOR marks as collected
       ↓
┌─────────────┐
│  COLLECTED  │ ← Driver picked up, visible to ALL PLANT_OPERATORS
└──────┬──────┘
       │ ANY PLANT_OPERATOR can accept
       ↓
┌─────────────────────┐
│ RECEIVED_AT_PLANT   │ ← Assigned to specific plant, only that plant sees it
└──────┬──────────────┘
       │ PLANT_OPERATOR processes
       ↓
┌─────────────┐
│ PROCESSING  │ ← Being cleaned
└──────┬──────┘
       │ PLANT_OPERATOR completes
       ↓
┌─────────────┐
│  PROCESSED  │ ← Cleaning done
└──────┬──────┘
       │ PLANT_OPERATOR dispatches
       ↓
┌─────────────┐
│ DISPATCHED  │ ← Driver returns to pressing
└──────┬──────┘
       │ SUPERVISOR marks as ready
       ↓
┌─────────────┐
│    READY    │ ← Available for client pickup
└──────┬──────┘
       │ SUPERVISOR delivers to client
       ↓
┌─────────────┐
│  DELIVERED  │ ← Complete
└─────────────┘
```

---

## API Endpoints

### 1. Get Orders for SUPERVISOR (with history)

**Endpoint:** `GET /api/orders/pressing/{pressingId}`
**Permission:** ✅ SUPERVISOR (own pressing) | ✅ ADMIN

**Response includes status history:**
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
  "items": [...],
  "payment": {...},
  "statusHistory": [
    {
      "id": 1,
      "status": "CREATED",
      "changedByUserName": "John Supervisor",
      "changedAt": "2024-01-15T09:00:00Z"
    },
    {
      "id": 2,
      "status": "COLLECTED",
      "changedByUserName": "John Supervisor",
      "changedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": 3,
      "status": "RECEIVED_AT_PLANT",
      "changedByUserName": "Jane Operator",
      "changedAt": "2024-01-15T11:00:00Z"
    },
    {
      "id": 4,
      "status": "PROCESSING",
      "changedByUserName": "Jane Operator",
      "changedAt": "2024-01-15T11:15:00Z"
    }
  ],
  "createdAt": "2024-01-15T09:00:00Z"
}
```

---

### 2. Get COLLECTED Orders (for ALL Plant Operators)

**Endpoint:** `GET /api/orders/collected`
**Permission:** ✅ PLANT_OPERATOR | ✅ ADMIN
**No payment information**

**Response:**
```json
[
  {
    "id": 20,
    "referenceCode": "P1-20240115-0005",
    "pressingId": 1,
    "pressingName": "Main Pressing",
    "clientId": 8,
    "clientName": "Alice Smith",
    "plantId": null,
    "plantName": null,
    "status": "COLLECTED",
    "items": [...],
    "payment": null,
    "statusHistory": [
      {
        "id": 45,
        "status": "CREATED",
        "changedByUserName": "John Supervisor",
        "changedAt": "2024-01-15T14:00:00Z"
      },
      {
        "id": 46,
        "status": "COLLECTED",
        "changedByUserName": "John Supervisor",
        "changedAt": "2024-01-15T15:00:00Z"
      }
    ],
    "createdAt": "2024-01-15T14:00:00Z"
  }
]
```

**Use Case:** Plant operators see all COLLECTED orders (driver is on the way) and can accept orders when they arrive.

---

### 3. Get Orders for PLANT_OPERATOR (assigned to their plant)

**Endpoint:** `GET /api/orders/plant/{plantId}`
**Permission:** ✅ PLANT_OPERATOR (own plant) | ✅ ADMIN
**No payment information**

**Response:** Orders assigned to their plant (statuses: RECEIVED_AT_PLANT, PROCESSING, PROCESSED, DISPATCHED)

---

### 4. Bulk Update with History Tracking

**Endpoint:** `POST /api/orders/bulk-update-status`

**Request:**
```json
{
  "orderIds": [20, 21, 22],
  "newStatus": "RECEIVED_AT_PLANT",
  "plantId": 1
}
```

**What Happens:**
1. Orders status updated to RECEIVED_AT_PLANT
2. Orders assigned to plant ID 1
3. Status history recorded with user info:
   - Status: RECEIVED_AT_PLANT
   - Changed by: Jane Operator (from JWT)
   - Changed at: 2024-01-15T15:30:00Z

**Response includes status history for each order**

---

## Frontend Implementation

### 1. SUPERVISOR Dashboard

```jsx
<SupervisorDashboard pressingId={userPressingId}>
  <Tabs>
    {/* Tab 1: At Pressing - Can Modify */}
    <Tab label="At Pressing">
      <StatusSection status="CREATED">
        <OrderCardWithHistory selectable showPayment />
        <BulkAction status="COLLECTED">Mark as Collected</BulkAction>
      </StatusSection>

      <StatusSection status="READY">
        <OrderCardWithHistory selectable showPayment />
        <BulkAction status="DELIVERED">Deliver to Client</BulkAction>
      </StatusSection>
    </Tab>

    {/* Tab 2: In Transit - Read Only */}
    <Tab label="In Transit" readOnly>
      <StatusSection status="COLLECTED">
        <OrderCardWithHistory showPayment />
        <StatusTimeline order={order} />
        <InfoBadge>Driver on the way to plant</InfoBadge>
      </StatusSection>

      <StatusSection status="DISPATCHED">
        <OrderCardWithHistory selectable showPayment />
        <StatusTimeline order={order} />
        <BulkAction status="READY">Mark as Ready</BulkAction>
      </StatusSection>
    </Tab>

    {/* Tab 3: At Plant - Read Only with Timeline */}
    <Tab label="At Plant" readOnly>
      <StatusSection status="RECEIVED_AT_PLANT">
        <OrderCardWithHistory showPayment />
        <StatusTimeline order={order} />
        <PlantInfo plantName={order.plantName} />
      </StatusSection>

      <StatusSection status="PROCESSING">
        <OrderCardWithHistory showPayment />
        <StatusTimeline order={order} />
        <InfoBadge>Being processed at {order.plantName}</InfoBadge>
      </StatusSection>

      <StatusSection status="PROCESSED">
        <OrderCardWithHistory showPayment />
        <StatusTimeline order={order} />
        <InfoBadge>Waiting for dispatch</InfoBadge>
      </StatusSection>
    </Tab>

    {/* Tab 4: Completed */}
    <Tab label="Completed">
      <StatusSection status="DELIVERED">
        <OrderCardWithHistory showPayment />
        <StatusTimeline order={order} complete />
      </StatusSection>
    </Tab>
  </Tabs>
</SupervisorDashboard>
```

---

### 2. PLANT_OPERATOR Dashboard

```jsx
<PlantOperatorDashboard plantId={userPlantId}>
  <Tabs>
    {/* Tab 1: Incoming - COLLECTED Orders (All Plants) */}
    <Tab label="Incoming Orders">
      <InfoBanner>
        These orders have been collected from pressings. Accept them when they arrive at your plant.
      </InfoBanner>

      <OrderGrid>
        {collectedOrders.map(order => (
          <OrderCardWithHistory
            key={order.id}
            order={order}
            selectable
            hidePayment
            showTimeline
          />
        ))}
      </OrderGrid>

      <BulkAction
        status="RECEIVED_AT_PLANT"
        requiresPlant={userPlantId}
      >
        Accept at Our Plant
      </BulkAction>
    </Tab>

    {/* Tab 2: Our Orders - Active Processing */}
    <Tab label="Our Orders">
      <StatusSection status="RECEIVED_AT_PLANT">
        <OrderCardWithHistory selectable hidePayment showTimeline />
        <BulkAction status="PROCESSING">Start Processing</BulkAction>
      </StatusSection>

      <StatusSection status="PROCESSING">
        <OrderCardWithHistory selectable hidePayment showTimeline />
        <BulkAction status="PROCESSED">Mark as Complete</BulkAction>
      </StatusSection>

      <StatusSection status="PROCESSED">
        <OrderCardWithHistory selectable hidePayment showTimeline />
        <BulkAction status="DISPATCHED">Dispatch to Pressing</BulkAction>
      </StatusSection>
    </Tab>

    {/* Tab 3: History */}
    <Tab label="Dispatched History">
      <StatusSection status="DISPATCHED" readOnly>
        <OrderCardWithHistory hidePayment showTimeline />
        <InfoBadge>On the way back to pressing</InfoBadge>
      </StatusSection>
    </Tab>
  </Tabs>
</PlantOperatorDashboard>
```

---

### 3. Order Card with Status History Timeline

```jsx
function OrderCardWithHistory({ order, showPayment, showTimeline }) {
  return (
    <Card>
      <OrderHeader>
        <ReferenceCode>{order.referenceCode}</ReferenceCode>
        <StatusBadge status={order.status} />
      </OrderHeader>

      <OrderDetails>
        <Client>{order.clientName}</Client>
        {order.plantName && <Plant>{order.plantName}</Plant>}
        <Items>{order.items.map(item => ...)}</Items>
      </OrderDetails>

      {showPayment && order.payment && (
        <PaymentSection>
          <Amount>${order.payment.amount}</Amount>
          <Method>{order.payment.method}</Method>
        </PaymentSection>
      )}

      {showTimeline && (
        <StatusTimeline history={order.statusHistory} />
      )}
    </Card>
  );
}

function StatusTimeline({ history }) {
  return (
    <Timeline>
      {history.map((item, index) => (
        <TimelineItem key={item.id} isLast={index === history.length - 1}>
          <TimelineIcon status={item.status} />
          <TimelineContent>
            <StatusName>{item.status}</StatusName>
            <TimelineDetails>
              <UserName>{item.changedByUserName}</UserName>
              <Timestamp>{formatDate(item.changedAt)}</Timestamp>
            </TimelineDetails>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
```

**Timeline Visual Example:**
```
📝 CREATED
   by John Supervisor
   Jan 15, 9:00 AM
   ↓
🚚 COLLECTED
   by John Supervisor
   Jan 15, 10:30 AM
   ↓
📥 RECEIVED_AT_PLANT
   by Jane Operator
   Jan 15, 11:00 AM
   ↓
⚙️ PROCESSING
   by Jane Operator
   Jan 15, 11:15 AM (Current)
```

---

## Key Implementation Points

### 1. COLLECTED Orders Visibility

**Backend:**
- `GET /api/orders/collected` returns all orders with status COLLECTED
- Available to ALL plant operators
- No payment information included

**Frontend:**
- Plant operators see "Incoming Orders" tab
- Shows all COLLECTED orders (from all pressings)
- Can select and accept orders to their plant
- Once accepted, order moves to "Our Orders" tab

### 2. Status History Tracking

**Backend:**
- Every status change creates a record in `order_status_history` table
- Stores: status, user ID, user name, timestamp
- Automatically included in all order responses
- Sorted by timestamp (ascending)

**Frontend:**
- Display as timeline in order details
- Show who changed status and when
- Helps supervisors track order progress
- Useful for debugging and auditing

### 3. Read-Only Views for SUPERVISOR

**While orders are at plant (RECEIVED_AT_PLANT → PROCESSED):**
- SUPERVISOR can see them (for tracking)
- But cannot modify them
- Can see status history to track progress
- Visual indicators showing read-only status

**Backend enforces this:**
- SUPERVISOR cannot bulk update plant statuses
- Returns 403 if they try

---

## Database Schema

### order_status_history Table

```sql
CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by_user_id BIGINT,
    changed_by_user_name VARCHAR(255),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

**Indexes:**
- `order_id` - Fast lookup of history for an order
- `changed_at` - Time-based queries

---

## API Summary Table

| Endpoint | Method | Purpose | Who Can Access |
|----------|--------|---------|----------------|
| `/api/orders/pressing/{id}` | GET | Get orders for pressing (with history) | SUPERVISOR, ADMIN |
| `/api/orders/plant/{id}` | GET | Get orders for plant (no payment, with history) | PLANT_OPERATOR, ADMIN |
| `/api/orders/collected` | GET | Get COLLECTED orders (no payment, with history) | ALL PLANT_OPERATORS, ADMIN |
| `/api/orders/bulk-update-status` | POST | Update status with history tracking | Role-specific (validated) |

---

## Status History Use Cases

### 1. Tracking Delays

**Scenario:** Order stuck at plant for too long

**Solution:** Check status history
```
RECEIVED_AT_PLANT - Jan 15, 11:00 AM
PROCESSING - Jan 15, 11:15 AM
(still in PROCESSING after 3 hours)
```

### 2. Accountability

**Scenario:** Who dispatched this order back?

**Solution:** Check history
```
DISPATCHED - Jan 15, 4:30 PM by Jane Operator
```

### 3. Process Optimization

**Scenario:** How long do orders spend at each stage?

**Solution:** Calculate time differences in history
```
COLLECTED → RECEIVED_AT_PLANT: 30 minutes
RECEIVED_AT_PLANT → PROCESSING: 15 minutes
PROCESSING → PROCESSED: 2 hours 45 minutes
PROCESSED → DISPATCHED: 15 minutes
```

---

## Testing the Workflow

### Test Scenario: Complete Order Journey

1. **SUPERVISOR creates order:**
   - POST `/api/orders` → status: CREATED
   - Check response has `statusHistory` with CREATED entry

2. **SUPERVISOR marks as collected:**
   - POST `/api/orders/bulk-update-status` with status: COLLECTED
   - Check history has 2 entries (CREATED, COLLECTED)

3. **ALL PLANT_OPERATORS see it:**
   - GET `/api/orders/collected` from multiple plant operator accounts
   - All see the order
   - payment is null

4. **PLANT_OPERATOR 1 accepts it:**
   - POST `/api/orders/bulk-update-status` with status: RECEIVED_AT_PLANT, plantId: 1
   - Order assigned to plant 1
   - Check history has 3 entries

5. **PLANT_OPERATOR 2 cannot see it:**
   - GET `/api/orders/plant/2` doesn't include this order
   - Only assigned plant sees it

6. **SUPERVISOR sees it read-only:**
   - GET `/api/orders/pressing/1` includes this order
   - Can see status history
   - Cannot bulk update (validated server-side)

7. **Complete processing:**
   - PLANT_OPERATOR: PROCESSING → PROCESSED → DISPATCHED
   - Each transition adds to history

8. **SUPERVISOR completes:**
   - DISPATCHED → READY → DELIVERED
   - Full history from CREATED to DELIVERED

---

## Summary

**What's Implemented:**
- ✅ Status history tracking for all orders
- ✅ COLLECTED orders visible to all plant operators
- ✅ Plant operators can accept and assign orders to their plant
- ✅ Supervisors see orders as read-only while at plant
- ✅ Complete audit trail of who changed what and when
- ✅ Timeline visualization support
- ✅ No payment information for plant operators

**Frontend Must Build:**
1. Status timeline component showing history
2. "Incoming Orders" tab for plant operators (COLLECTED orders)
3. Read-only indicators for supervisors
4. Time-based analytics using status history
5. Plant assignment UI for accepting COLLECTED orders

**Key Difference from Previous Version:**
- **COLLECTED orders are visible to ALL plant operators** (not just one plant)
- **Status history is automatically recorded** with user info and timestamps
- **Supervisors can track progress** through read-only views and history
- **Complete audit trail** for compliance and debugging

This matches the real-world workflow: driver collects from pressing, any plant can receive when they arrive, supervisor tracks progress!
