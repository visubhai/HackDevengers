# 🧪 Final Quality Assurance Checklist

**Version**: 1.0.0-RC1
**Executioner**: User / QA Team

---

## 🛑 Pre-Flight Checks
- [ ] **Environment Variables**: Verify `.env.production` has correct `MONGODB_URI` and `AUTH_SECRET`.
- [ ] **Database Migration**: Ensure database seeding (`npm run seed`) has been performed on Production DB.

## 1. Booking Workflow
- [ ] **Create Booking (Paid)**:
    - [ ] Fill all fields. Select "Paid". 
    - [ ] Save.
    - [ ] Verify: Status matches "Booked".
    - [ ] Verify: Ledger Entry created (type: CREDIT).
- [ ] **Create Booking (To Pay)**:
    - [ ] Fill all fields. Select "To Pay".
    - [ ] Save.
    - [ ] Verify: Status matches "Booked".
    - [ ] Verify: **NO** Ledger Entry created yet.
- [ ] **Validation**:
    - [ ] Try empty submit. Verify error messages.
    - [ ] Try invalid phone number. Verify error.

## 2. Inbound & Delivery Logic
- [ ] **Branch Filter**: Ensure you are viewing the correct destination branch.
- [ ] **Receive (In Transit -> Arrived)**:
    - [ ] Find a "Booked" parcel.
    - [ ] Click "Receive". 
    - [ ] Confirm: Status updates to "Arrived".
- [ ] **Deliver (Arrived -> Delivered) [Safe]**:
    - [ ] Find a "Paid" parcel that is "Arrived".
    - [ ] Click "Deliver".
    - [ ] Verify: Modal says "Payment Pre-paid".
    - [ ] Confirm. Status updates to "Delivered".
- [ ] **Deliver (Arrived -> Delivered) [Collection]**:
    - [ ] Find a "To Pay" parcel that is "Arrived".
    - [ ] Click "Deliver".
    - [ ] Verify: Modal prompts "Collect ₹XXX".
    - [ ] Confirm. Status updates to "Delivered".
    - [ ] Verify: Ledger Entry created (type: CREDIT) for the destination branch.

## 3. Financials & Reports
- [ ] **Filters**: Test "Paid" vs "To Pay" filters.
- [ ] **Date Range**: Change dates and verify data updates.
- [ ] **Export**:
    - [ ] Click "PDF". Check formatting.
    - [ ] Click "Excel". Check columns.
- [ ] **Totals**: Verify "Revenue" card matches sum of "Paid" bookings + "Collected" deliveries.

## 4. Security & Access
- [ ] **Login**: Test with Valid and Invalid credentials.
- [ ] **Logout**: Ensure session is cleared.
- [ ] **Protected Routes**: Try to access `/dashboard/super-admin` as a normal Admin. Should redirect or 403.

## 5. System Health
- [ ] **Dashboard**: Visit `/dashboard/super-admin/system-health`.
- [ ] **Audit Logs**: Verify recent actions (Booking, Status Change) appear in the log list.
