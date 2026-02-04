# Table PIN Security System

This document describes the table PIN security system implemented to prevent unauthorized ordering through shared or bookmarked menu links.

## Overview

The Table PIN Security System provides a multi-layered approach to ensure that only customers physically present at a table can place orders:

1. **Table Activation** - Staff must activate a table before customers can order
2. **PIN Validation** - Customers enter a 4-digit PIN to place orders
3. **Shared Orders** - One order per table (all customers add to the same order)
4. **Location Verification** (Optional) - GPS-based flagging for suspicious orders

## How It Works

### Staff Workflow

1. **Activate Table**
   - When customers arrive, staff clicks "Activate" on the table card
   - System generates a random 4-digit PIN (e.g., "4829")
   - An empty order is created for the table
   - PIN is prominently displayed for staff to share with customers

2. **Share PIN**
   - Staff verbally tells customers the PIN
   - PIN is displayed on the table card in the admin panel

3. **Regenerate PIN** (if needed)
   - If staff suspects PIN was shared externally, click "New PIN"
   - Generates a fresh PIN without closing the table
   - Old PIN immediately becomes invalid

4. **Close Table**
   - When customers leave, staff clicks "Close Table"
   - Clears the PIN and active order link
   - Table returns to inactive state

### Customer Workflow

1. **Scan QR Code**
   - Customer scans the permanent QR code on the table
   - Menu loads with all products visible
   - Browse and add items to cart freely

2. **Place Order**
   - When ready to order, tap "Place Order"
   - PIN modal appears asking for the 4-digit code
   - Enter PIN provided by staff

3. **PIN Validation**
   - If correct: Order is submitted, PIN stored in browser session
   - If incorrect: Error message, can retry
   - Subsequent orders during session don't need PIN re-entry

4. **Shared Order**
   - All customers at the table see the same order
   - Items added by anyone appear for everyone
   - Staff can see the complete table order

## Security Layers

### Layer 1: Table Activation
- Tables are inactive by default
- Inactive tables reject all order attempts
- Only staff can activate/deactivate tables

### Layer 2: PIN Validation
- 4-digit numeric PIN required for every order
- PIN is per-table, changes each activation
- Stored in `sessionStorage` (cleared when browser closes)

### Layer 3: Shared Order Model
- One order per active table session
- Remote orders would be instantly visible to customers at the table
- Makes malicious orders immediately detectable

### Layer 4: Location Verification (Optional)
- Restaurant sets their GPS coordinates in Settings
- When customers order, browser requests location permission
- Orders from outside the radius are flagged (not blocked)
- Staff can review flagged orders

## Database Schema

### Table Model
```
order_pin: VARCHAR(6)        -- 4-digit PIN
is_active: BOOLEAN           -- Is table accepting orders?
active_order_id: INTEGER     -- Current shared order FK
activated_at: TIMESTAMP      -- When activated
```

### Tenant Model (Location Settings)
```
latitude: DOUBLE PRECISION   -- Restaurant GPS latitude
longitude: DOUBLE PRECISION  -- Restaurant GPS longitude
location_radius_meters: INT  -- Validation radius (default: 100m)
location_check_enabled: BOOL -- Enable GPS checking
```

### Order Model
```
flagged_for_review: BOOLEAN  -- Needs staff attention
flag_reason: VARCHAR         -- Why order was flagged
```

### OrderItem Model
```
added_by_session: VARCHAR    -- Which browser added this item
location_flagged: BOOLEAN    -- Added from suspicious location
```

## API Endpoints

### Table Session Management

```
POST /tables/{id}/activate
Response: { id, name, pin, is_active, active_order_id, activated_at }

POST /tables/{id}/close
Response: { id, name, is_active, message }

POST /tables/{id}/regenerate-pin
Response: { id, name, pin, is_active }
```

### Order Submission

```
POST /menu/{table_token}/order
Request: {
  items: [...],
  pin: "1234",           # Required
  latitude: 41.385064,   # Optional
  longitude: 2.173404    # Optional
}
Response: { order_id, items_added }

Error Responses:
- 403: "Table is not accepting orders"
- 403: "PIN required"
- 403: "Invalid PIN"
```

### Menu Response

The `GET /menu/{table_token}` endpoint now includes:
```json
{
  "table_is_active": true,
  "table_requires_pin": true,
  "active_order_id": 123,
  ...
}
```

## Configuration

### Enable Location Verification

1. Go to **Settings** → **Payment Settings**
2. Enable "Location verification"
3. Enter your restaurant's coordinates OR click "Use current location"
4. Set the radius in meters (default: 100m)
5. Save changes

### Recommended Settings

| Setting | Recommended Value | Notes |
|---------|-------------------|-------|
| Radius | 50-100 meters | Small radius for precision |
| Location Check | Enabled | Flags but doesn't block |

## Frontend Components

### Tables Component
- Status badge (Active/Inactive with animated dot)
- PIN display (large, readable font)
- Activate/Close/New PIN buttons
- Disabled state while loading

### Menu Component
- PIN modal (4-digit input, numeric keyboard on mobile)
- Error handling for invalid PIN
- PIN stored in `sessionStorage` per table
- Geolocation request (non-blocking)

### Settings Component
- Location verification toggle
- Latitude/Longitude inputs
- Radius configuration
- "Use current location" button

## Translations

All UI strings are translated in:
- English (en)
- Spanish (es)
- Catalan (ca)
- German (de)
- Hindi (hi)
- Chinese Simplified (zh-CN)

## Migration

Apply the database migration:

```bash
docker-compose exec backend python -m app.migrate
```

Or run manually:
```sql
-- See: back/migrations/20260204000000_add_table_pin_and_location.sql
```

## Troubleshooting

### "Table is not accepting orders"
- Staff needs to click "Activate" on the table
- Check if table was accidentally closed

### "Invalid PIN"
- Verify the correct PIN with staff
- Staff may have regenerated the PIN
- Check for typos (common: 0/O, 1/I)

### Location flagged orders
- Orders from outside radius are flagged, not blocked
- Customer may have denied location permission
- GPS accuracy varies (especially indoors)

### PIN not being asked
- PIN is stored in `sessionStorage` after first success
- Clear browser data or use incognito to test
- Different browsers/devices each need their own PIN entry

## Security Considerations

1. **PIN Complexity**: 4-digit PINs (10,000 combinations) are sufficient for short-lived table sessions
2. **Rate Limiting**: Consider adding rate limiting for PIN attempts in production
3. **Expiration**: PINs are cleared when table is closed (natural expiration)
4. **Visibility**: PIN is only visible to authenticated staff in admin panel
5. **Location**: GPS verification is optional and flags (doesn't block) orders
