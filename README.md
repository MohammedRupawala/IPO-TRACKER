# IPO Tracker & Allotment Manager

A modern, full-stack application for tracking IPO listings, managing family PAN cards, and automatically checking IPO allotment status across registrar platforms (e.g., Cameo) in the background.

## 🚀 Features

- **Personalized Dashboard**: View family members' PAN cards, allotment status, and statistics in a clean interface.
- **Clickable Member Details**: Modal dialog view for detailed allotment tracking metrics per family member.
- **Admin Portal**: 
  - Register new IPO entries.
  - Delete retired listings.
  - Monitor all platform members.
  - View paginated platform logs.
  - Trigger registrar scraping/sync jobs.
- **Background Worker & Scraper**: Consumer task worker listening on RabbitMQ queues, reading captcha forms via OCR (PyTesseract & OpenCV), parsing allotment outputs, and updating database values.
- **Modern Tech Stack**: React/Next.js (Zustand + Radix UI), FastAPI (Python), RabbitMQ, and PostgreSQL (Supabase).

---

## 🛠️ Architecture

The project consists of four primary components:

1. **Frontend (`client`)**: Next.js single-page dashboard.
2. **Backend (`server`)**: FastAPI REST API handling user data, JWT authentication, member management, and job publishing.
3. **Broker (`rabbitmq`)**: RabbitMQ AMQP server queueing allotment scraper tasks.
4. **Worker (`worker`)**: Python background daemon consuming task queues, solving registrar CAPTCHAs, parsing results, and updating DB states.

```
┌──────────────┐         ┌──────────────┐
│  Next.js UI  ├────────>│ FastAPI API  │
└──────────────┘         └──────┬───────┘
                                │ (Publishes Tasks)
                                ▼
 ┌────────────┐          ┌──────────────┐
 │ PostgreSQL │<─────────┤ RabbitMQ Msg │
 └─────▲──────┘          └──────┬───────┘
       │ (Updates DB)           │ (Consumes Tasks)
 ┌─────┴──────┐                 ▼
 │ Py Worker  │<────────────────┘
 └────────────┘
```

---

## 📦 Getting Started (Docker Compose - Recommended)

The entire stack can be launched with a single command using Docker.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

1. **Clone the repository** and navigate to the project directory:
   ```bash
   cd IPO-TRACKER
   ```

2. **Configure Environment Variables**:
   Copy the `.env.example` in `server/` to `server/.env` and fill in your Supabase DB credentials:
   ```bash
   cp server/.env.example server/.env
   ```
   *Note: Next.js env configuration defaults to point to the local FastAPI port (`http://localhost:8000`).*

3. **Start the Stack**:
   Build and start all containers in detached mode:
   ```bash
   docker compose up -d --build
   ```

4. **Access the Applications**:
   - **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
   - **Backend OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **RabbitMQ Management Console**: [http://localhost:15672](http://localhost:15672) (Login: `guest`/`guest`)

5. **Stop the Stack**:
   ```bash
   docker compose down
   ```

---

## 💻 Manual Setup (Local Development)

If you prefer to run services outside of containers:

### 1. Prerequisite: RabbitMQ
Ensure RabbitMQ is running locally on default port `5672` (or launch a standalone container):
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 2. Backend API Setup
Requires Python 3.12+ and `uv`:
```bash
cd server
uv sync
# Copy and configure environment variables in .env
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Background Worker Setup
Requires system dependencies for OCR (`tesseract-ocr` and OpenCV libraries):
- **Windows**: Install Tesseract OCR and add it to your System PATH.
- **Linux**: `sudo apt-get install tesseract-ocr libgl1`
```bash
cd server
uv run python -m app.workers.allotment_worker
```

### 4. Frontend Client Setup
Requires Node.js 18+:
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the client.

## 🔒 Configuration (`.env`)

Configure the following variables in `server/.env`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase API connection URL | `https://<your-project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase high-privilege service role API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...` |
| `JWT_SECRET_KEY` | Random cryptographic secret key for signing Auth cookies | `change-me-to-a-long-random-secret` |
| `JWT_ALGORITHM` | Signature hashing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiry duration for user access tokens | `15` |
| `REFRESH_TOKEN_EXPIRE_MINUTES`| Expiry duration for refresh tokens (7 days) | `10080` |
| `COOKIE_SECURE` | Set secure flag for cookie storage (requires HTTPS) | `false` |
| `RABBITMQ_URL` | AMQP broker connection endpoint | `amqp://guest:guest@localhost:5672/` |

---

## 🗄️ Database Schema Replication

To set up the necessary tables, types, and indexes in your Supabase PostgreSQL database, copy and run the SQL commands from the database script located in the repository:
👉 **[server/app/schemas/schema.sql]**

You can execute this script directly within the Supabase **SQL Editor**.

---


## 🔍 Allotment Status States

When registrar queries complete, members are updated with one of the following states:
- **`Not-Applied`**: The PAN was not found on the registrar's matching listing.
- **`Not-Allotted`**: The application was found, but the shares allocated equal `0`.
- **`Allotted`**: The application was successful, and shares allocated are greater than `0`.

---

## 🔮 Future Production Improvements

For production deployments, the following architectural and feature updates are recommended:

1. **Admin User Seeding / Promotion**:
   - Currently, roles are manually toggled in the database (e.g., updating the `role` column in the `users` table to `admin`).
   - For production, implement a secure SQL seeder or a restricted signup validation process to securely bootstrap the initial administrator accounts.
2. **PAN Verification**:
   - Add frontend/backend validation constraints (matching standard PAN card regex patterns: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).
   - Integrate with external PAN validation APIs to verify PAN holder names and authenticity before adding them to the database.

