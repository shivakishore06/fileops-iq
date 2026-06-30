# FileOps IQ — Enterprise File Operations & Analytics Platform

[![License: Source--Available](https://img.shields.io/badge/License-Source--Available-orange.svg)](./LICENSE)
[![NodeJS](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v11-red.svg)](https://nestjs.com/)
[![NextJS](https://img.shields.io/badge/Next.js-v16-black.svg)](https://nextjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-blue.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compatible-blue.svg)](https://www.docker.com/)

FileOps IQ is a state-of-the-art, production-ready, cloud-native enterprise SaaS platform for **File Operations, Monitoring, and Analytics**. It monitors, tracks, validates, and visualizes every file exchanged across your organization from arrival to archival. 

Designed for Fortune 500 compliance, FileOps IQ ensures full visibility, security auditing, and automated data purging across multi-tenant infrastructures.

---

## 🚀 Key Features

*   **Multi-Tenancy & Isolation**: Scope data storage and queries completely per-tenant using NestJS `AsyncLocalStorage` and a Prisma Proxy interceptor.
*   **Diverse Storage Drivers**: Direct support for local folders, **SFTP**, **FTP/FTPS**, **AWS S3**, **Azure Blob Storage**, and **Google Cloud Storage**.
*   **Data Retention Purging**: Automated background scheduler purges or archives historical logs and physical records per-tenant rules.
*   **Telemetry & Observability**: Integrated health probes (`/health/live`, `/health/ready`), Prometheus metrics format (`/health/metrics`), and winston structured JSON logging.
*   **API Documentation**: Auto-generated Swagger/OpenAPI docs available at `/api/docs`.
*   **AI Copilot Engine**: Natural language query engine mapped dynamically to custom charts, alert metrics, or throughput logs.
*   **Operational Dashboard**: Recharts data volume trends, SLA compliance checkers, and live Socket.io incident logs.
*   **Security Gating**: Encrypted credentials at rest (AES-256) and Role-Based Access Control (RBAC).

---

## 🛠️ Technology Stack

| Component | Framework / Library |
|---|---|
| **Backend Framework** | NestJS (TypeScript) |
| **Frontend Framework** | Next.js (App Router, Turbopack) |
| **Database ORM** | Prisma + PostgreSQL |
| **Message Queue** | BullMQ + Redis |
| **WebSocket** | Socket.io |
| **Object Storage** | MinIO / AWS S3 |
| **Styling** | Tailwind CSS + Framer Motion |

---

## 📂 Repository Structure

```
├── backend/                  # NestJS API application
│   ├── src/
│   │   ├── config/           # Joi environment validation
│   │   ├── connection/       # Multi-protocol storage drivers
│   │   ├── retention/        # Scheduled data cleanup
│   │   ├── feature-flag/     # Gated feature toggle system
│   │   ├── health/           # Liveness/Readiness probes & metrics
│   │   ├── prisma/           # Dynamic tenancy query proxy
│   │   └── copilot/          # Natural language helper
│   └── prisma/               # Schema and migrations
└── frontend/                 # Next.js App Router client
    ├── src/
    │   ├── app/              # Files explorer, Audit log, Settings UIs
    │   ├── components/       # Custom global navigation and layouts
    │   └── providers/        # Authentication and Tanstack Query providers
```

---

## ⚙️ Quick Start

### Prerequisites
*   Node.js v18+
*   Docker & Docker Compose

### 1. Docker Compose (Recommended)
Spin up the database, cache, storage stack, backend API, and frontend client instantly:
```bash
# Clone the repository
git clone https://github.com/yourusername/fileops-iq.git
cd fileops-iq

# Run the stack
docker-compose up --build
```
*   **Frontend**: `http://localhost:3000`
*   **Backend API**: `http://localhost:3001`
*   **Swagger Docs**: `http://localhost:3001/api/docs`
*   **MinIO Console**: `http://localhost:9001`

### 2. Manual Local Development

#### A. Spin up backing services
```bash
docker-compose up -d postgres redis minio
```

#### B. Setup Backend
1. Copy environmental template and initialize:
```bash
cd backend
cp .env.example .env
npm install
```
2. Run database migrations:
```bash
npx prisma migrate dev
```
3. Start in development mode:
```bash
npm run start:dev
```

#### C. Setup Frontend
1. Install dependencies:
```bash
cd ../frontend
npm install
```
2. Start development server:
```bash
npm run dev
```

---

## 🔒 Security & Tenant Boundaries
Tenant context is extracted from headers and stored dynamically inside asynchronous local storage, auto-appending `tenantId` to all database mutations. This prevents data leaks between enterprise accounts.

Credentials (passwords, SSH private keys) are encrypted using AES-256-GCM.

---

## 📜 License
Distributed under a Custom Source-Available / Non-Commercial License. Siva Kishore retains all copyright ownership. Resale and commercial distribution are strictly prohibited. See `LICENSE` for details.
