# 📚 Parcel Management System - Documentation Pack

## 1. System Overview
**Product Name**: ABCD Logistics Platform (Enterprise Edition)
**Version**: 1.0.0 (Commercial Release)
**Architecture**: 
- **Frontend**: Next.js 15 (React 19, Tailwind 4)
- **Backend**: Node.js + Express.js (REST API)
- **Database**: MongoDB (Mongoose) + Redis (Optional)
- **Integrations**: NextAuth (Auth), WhatsApp-web.js (Notifications)

This system is a multi-tenant logistics ERP designed for transport companies to manage booking, dispatch, and delivery of parcels across multiple branches. It features Role-Based Access Control (RBAC), real-time reporting, and financial tracking.

---

## 2. 👥 User Manuals

### A. Super Admin Manual
**Login**: Access `/login`. Default credentials provided during setup.
**Key Responsibilities**:
1.  **Branch Management**: Create/Edit branches in Settings -> Branch Management.
2.  **User Management**: Create Admins for each branch. Assign them strictly to one branch.
3.  **System Health**: Monitor `/dashboard/super-admin/system-health` for errors and audit logs.
4.  **Reports**: View "Revenue Report" to track total income across all branches.

### B. Admin (Branch Manager) Manual
**Login**: Use credentials provided by Super Admin.
**Key Workflows**:
1.  **Booking a Parcel**: 
    - Go to "New Booking".
    - Select "Receiver Branch" (Destination).
    - Enter Sender/Receiver details. Use the autocomplete to find frequent customers.
    - Add items (Cartons/Sacks).
    - Click "Book Parcel". A PDF receipt will auto-generate.
2.  **Inbound Management**:
    - Go to "Inbound".
    - You will see parcels sent *to your branch* from others.
    - Click "Receive" when physical goods arrive. Status changes to `ARRIVED`.
3.  **Delivery**:
    - When customer comes to collect, find the parcel in "Inbound".
    - Click "Deliver". Status changes to `DELIVERED`.
    - If "To Pay", collect cash before clicking Deliver.

---

## 3. 🚀 Deployment Guide

### A. Environment Setup
Create a `.env.local` (and set in Vercel Environment Variables):
```env
MONGODB_URI=your-mongodb-connection-string
AUTH_SECRET=your-nextauth-secret
```

### B. Database Migration (MongoDB)
1.  Ensure MongoDB instance is running.
2.  Seed initial data using the admin seeding script: `npm run seed`.

### C. Vercel Deployment
1.  Connect GitHub repo to Vercel.
2.  Add Environment Variables.
3.  Deploy.
4.  **Domain**: Add Custom Domain in Vercel Settings -> Domains.

---

## 🏗️ Technical Deep-Dive

### A. Component Architecture
The frontend is built with a highly modular, atomic structure using **Radix UI** and **Tailwind CSS 4**:

- **Layout Components**: `Sidebar.tsx`, `Header.tsx`, `GlobalErrorBoundary.tsx`.
- **Booking Module**: Handles multi-step parcel entry and LR generation.
- **Inbound/Delivery**: Specialized tables with real-time status updates.
- **Shared UI**: Located in `@/components/ui/` (Button, Input, Table, Modal).

### B. State Management (Zustand)
We use **Zustand** for global, persistent state to minimize prop drilling:
- **`useBranchStore`**: 
  - Manages the active branch, current user session, and theme (dark/light).
  - Persists to `localStorage` for session continuity.
- **`useBookingStore`**: Temporary state for multi-item bookings before submission.

### C. Data Fetching (SWR)
- Real-time data synchronization is achieved via `swr`.
- **Global Config**: Managed in `SWRProvider.tsx` for consistent revalidation and error handling.

---

## 🔐 Security & Operations

### A. Data Backup
- **MongoDB Atlas**: Automatic backups are enabled by default on paid clusters.
- **Manual Dump**: Use `mongodump` for manual backups.

### B. Disaster Recovery
- **RPO (Recovery Point Objective)**: Depends on MongoDB configuration (Replica Sets).
- **RTO (Recovery Time Objective)**: Fast failover with Replica Sets.
- **Failover Strategy**: Detailed in [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).

---

## ❓ FAQ & Troubleshooting

| Question / Error | Solution |
| :--- | :--- |
| **"Permission Denied"** | You tried to perform an action not allowed for your role (e.g., Admin trying to delete a user). |
| **"Session Expired"** | Your NextAuth session has timed out. Re-log via `/login`. |
| **White Screen on Print** | Ensure `PrintBuilty` component is correctly mounted. Check console for browser print block. |
| **WhatsApp QR missing** | Restart the backend server and check terminal logs for the ASCII QR code. |

---

## 📄 Operational Manuals
- [User Manual](file:///Users/vishvampaghadar/Documents/parcel-management-system/docs/documentation_pack.md#2-user-manuals)
- [Architecture Deep-Dive](file:///Users/vishvampaghadar/Documents/parcel-management-system/docs/ARCHITECTURE.md)
- [QA Checklist](file:///Users/vishvampaghadar/Documents/parcel-management-system/docs/qa_checklist.md)
