# 🏗️ Technical Architecture - ABCD Logistics Platform

This document provides a deep-dive into the system's internal architecture, data models, and operational logic.

---

## 🗄️ Database Schema (Mongoose)

The system uses MongoDB with Mongoose for structured data management. Key models include:

### 1. **User & RBAC**
- **Roles**: `SUPER_ADMIN`, `ADMIN`, `OPERATOR`.
- **Branch Binding**: Admins and Operators are strictly bound to a single `branchId`. Super Admins have global access.
- **Fields**: `name`, `username`, `password` (hashed), `role`, `branchId`, `isActive`.

### 2. **Branch**
- **Fields**: `name`, `code` (e.g., "MUM", "DEL"), `address`, `contactNumber`, `settings`.

### 3. **Booking (The Core)**
- **LR ID**: Auto-incrementing sequence per branch.
- **Participants**: Sender & Receiver details (Name, Phone, Address).
- **Items**: Array of `{ description, quantity, weight, rate }`.
- **Financials**: `totalAmount`, `paymentStatus` (`PAID`, `TO_PAY`, `FREE`), `paymentMethod`.
- **Tracking**: `status` (`BOOKED`, `IN_TRANSIT`, `ARRIVED`, `DELIVERED`).

### 4. **Transaction (Ledger)**
- Tracks every financial movement.
- **Types**: `CREDIT` (Revenue), `DEBIT` (Expenses/Refunds).
- **Links**: Tied to a `bookingId` and `branchId`.

---

## 🔐 Security & Permissions

### Role-Based Access Control (RBAC)
- **Middleware**: `checkRole(['SUPER_ADMIN'])` protects sensitive backend routes.
- **Data Isolation**: All booking queries automatically include `{ branchId: req.user.branchId }` for non-Super Admin users.
- **Audit Logging**: Sensitive actions (deletions, role changes) are captured in the `AuditLog` collection.

---

## 📡 Background Services

### 1. WhatsApp Notifications (`whatsapp-web.js`)
- **Flow**: When a booking status changes to `ARRIVED`, a background job triggers a WhatsApp message to the receiver's phone number.
- **Session Management**: Uses a persistent session ID. QR code is logged to the terminal on startup if a new session is required.

### 2. PDF & Excel Reporting
- **PDF**: Uses `jspdf` and `jspdf-autotable` for high-density, print-optimized reports.
- **Excel**: Uses `xlsx` for data export in the frontend.

### 3. Real-time Updates (Socket.IO)
- Dashboard notification counts (e.g., "New Inbound Parcel") are pushed to active branch sessions via WebSockets.

---

## ⚙️ Development Workflows

### Monorepo Management
The project uses **NPM Workspaces**:
- `npm run dev`: Starts both frontend and backend using `concurrently`.
- `npm run db:reset`: Executes `scripts/production-reset.ts` to clear and re-seed the system.

---

## 📈 Future Scaling
- **Redis Integration**: Planned for caching frequent search queries (LR tracking).
- **Cluster Mode**: Ready for PM2 or Docker-swarms via the `Dockerfile` in the root.
