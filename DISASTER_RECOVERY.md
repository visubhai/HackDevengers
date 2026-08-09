# Disaster Recovery Plan
## Parcel Management System

This document outlines the disaster recovery procedures for the Parcel Management System API and Platform.

### 1. Database Failure & Restoration
**Scenario:** Primary MongoDB cluster fails or data is corrupted.
**Action:**
1. The system performs automated daily backups stored in the configured external storage volume or local `backups/` directory via `backupService.ts`.
2. To restore, use `mongorestore` or the `migrate-mongo` utilities if restoring schemas.
3. If using MongoDB Atlas, initiate point-in-time recovery to a timestamp exactly prior to corruption from the Atlas dashboard.

### 2. Service Outage
**Scenario:** Koyeb/Vercel or Render backend instance goes down.
**Action:**
1. The CI/CD pipeline triggers an auto-rollback if a deployment fails the health checks.
2. In case of massive infrastructure outage, our Docker images are published to GitHub Packages and can be spun up on any standard VPS (DigitalOcean/AWS EC2) with Docker Compose in under 5 minutes.
3. Change DNS records to point to the fallback node IP.

### 3. Traffic Spikes (DDoS)
**Action:**
1. The `express-rate-limit` middleware inherently drops abusive traffic IPs automatically.
2. Ensure Cloudflare or equivalent WAF is configured in "Under Attack Mode" to filter invalid requests before they hit the origin server.

### 4. Backup Retention Policy
- Database Backups are retained for 7 Days locally.
- In production, these should be synced to an S3 bucket with indefinite glacier archiving using a lifecycle policy.

### 5. Health Monitoring
Health metrics (DB connection, Uptime, Memory load) can be independently monitored at the `/api/health` endpoint by a service like UptimeRobot.
