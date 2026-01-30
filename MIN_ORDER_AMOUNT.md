# Minimum Order Amount Feature

## Overview

Admins can configure a **minimum order amount** (`minOrderAmount`) per pressing. When a supervisor creates an order, the API validates that the order's total amount meets or exceeds this minimum. If no minimum is configured (`null`), no restriction is applied.

---

## Pressing API Changes

### New Field: `minOrderAmount`

Added to the Pressing entity. Nullable — when `null`, no minimum is enforced.

### Create Pressing

**`POST /api/pressings`** (Admin only)

Request body now accepts an optional `minOrderAmount`:

```json
{
  "name": "Pressing Nouakchott",
  "address": "123 Main St",
  "active": true,
  "minOrderAmount": 500.00
}
```

### Update Pressing

**`PUT /api/pressings/{id}`** (Admin only)

Request body now accepts an optional `minOrderAmount`:

```json
{
  "minOrderAmount": 750.00
}
```

To remove the minimum (disable the constraint), the admin should set it to `0` or `null`.

### Get Pressing Response

All pressing responses now include the `minOrderAmount` field:

```json
{
  "id": 1,
  "name": "Pressing Nouakchott",
  "address": "123 Main St",
  "active": true,
  "minOrderAmount": 500.00,
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

When no minimum is configured, the field will be `null`.

---

## Order Creation Validation

**`POST /api/orders`** (Supervisor only)

When creating an order, the API calculates the total amount (sum of `quantity * price` for all items) and compares it against the pressing's `minOrderAmount`.

### Validation Rules

- If `pressing.minOrderAmount` is `null` — no validation, order is created normally.
- If `pressing.minOrderAmount` is set and `totalAmount >= minOrderAmount` — order is created normally.
- If `pressing.minOrderAmount` is set and `totalAmount < minOrderAmount` — order is **rejected**.

### Error Response (HTTP 400)

When the order total is below the minimum:

```json
{
  "error": "Order total (350.00) is below the minimum order amount (500.00) for this pressing"
}
```

---

## Frontend Integration Notes

1. **Admin panel**: When creating/editing a pressing, show a `minOrderAmount` input field. Allow the admin to leave it empty (no constraint) or set a positive value.

2. **Supervisor order form**: Before submitting an order, the frontend can read `minOrderAmount` from the pressing response (`GET /api/pressings/{id}`) and display a warning or disable the submit button if the current items total is below the minimum. This provides instant feedback without waiting for a server-side rejection.

3. **Error handling**: Handle the `400` response on `POST /api/orders` to display the minimum amount error message to the supervisor.
