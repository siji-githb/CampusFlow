# CampusFlow

> **An AI-Based Web Appointment and Queue Management System for College Registrar Transactions**

CampusFlow is a modern, unified web platform engineered to transform academic registrar services. By replacing physical queues, paper scheduling, and manual tracking with an automated, synchronized workflow, CampusFlow delivers an intuitive experience for students, an efficient operational dashboard for registrar staff, and actionable administrative controls for college leadership.

---

## 📌 System Highlights

* **Multi-Portal Architecture**: Dedicated, role-tailored interfaces for Students, Registrar Staff, and System Administrators.
* **Smart Appointment Scheduling**: Time-slot reservation engine with transaction-specific document checklists, automated cutoff policies, and cancellation safeguards.
* **Real-Time Live Queue Management**: Window-based physical counter workflow with instant WebSocket status synchronization.
* **Document Processing & Release Tracking**: Step-by-step progress tracking for transcript, diploma, certificate, and record requests.
* **Priority Lane Verification**: Streamlined digital application and document verification for graduating students, working scholars, and special-assistance applicants.
* **Virtual AI Assistant**: 24/7 natural-language guidance for institutional procedures, document requirements, and appointment inquiries.

---

## 🏛️ Portal Overviews

### 1. Student Portal
Designed for self-service accessibility on desktop and mobile devices:
* **Dashboard Overview**: Immediate status of active queue tickets, upcoming appointments, and ready-to-claim document notifications.
* **Appointment Booking**: Multi-step booking wizard with calendar selection, time slot availability, and requirement previews.
* **My Schedule & Appointments**: Centralized view to monitor, reschedule, or cancel pending appointments.
* **Live Queue Status**: Visual progress bar tracking current serving numbers, estimated wait status, assigned window, and pickup alerts.
* **Document Claiming**: Real-time status for document preparation, verification, and registrar window release.
* **Profile & Priority Management**: Digital profile management, notification preference controls, and priority lane verification submissions.
* **AI Registrar Guide**: Interactive assistant answering inquiries regarding registrar forms, policies, and requirements.

### 2. Staff Portal
Optimized for high-throughput registrar counter operations:
* **Window Assignment**: Secure service window claiming to maintain one-to-one counter accountability.
* **Live Queue Management**: One-click ticket calling, multi-step transaction progression, priority filtering, and ticket completion.
* **Appointment Check-Ins**: Daily schedule overview with attendance tracking and transaction validation.
* **Document Release Desk**: Verification and claiming management for ready certificates, transcripts, and records.
* **Academic Master List**: Fast student record verification during counter transactions.
* **Priority Request Review**: Digital review and approval for student priority access requests.
* **Direct Messaging**: Communication channel for student clarifications and transaction updates.

### 3. Admin Portal
Comprehensive administrative governance and office configuration:
* **Executive Analytics**: Real-time KPIs covering daily transaction volume, average service durations, peak hours, and completion rates.
* **Queue Monitoring**: Live bird's-eye view of all service windows, active staff, and counter queues.
* **Office & Window Configuration**: Flexible management of operating hours, appointment quotas, slot durations, and active service windows.
* **Transaction Catalog**: Configuration of available registrar services, document requirements, processing timelines, and routing steps.
* **User & Role Administration**: Role provisioning (`student`, `staff`, `admin`), profile moderation, and account status management.
* **Registrar Records Management**: Secure registry for student academic files, grades, and records.
* **Audit Trail**: Action logging documenting administrative updates with timestamps and actor identities.

---

## 💻 Technology Stack

### Frontend
* **Core Framework**: React 18 (SPA Architecture)
* **Build Tooling**: Vite
* **Styling**: Tailwind CSS & Modern Design Tokens
* **Icons**: Lucide React
* **Realtime Client**: Native WebSocket Engine with auto-reconnection

### Backend & Infrastructure
* **API Framework**: FastAPI (Python 3.11+)
* **ASGI Server**: Uvicorn
* **Database & Auth**: PostgreSQL / Relational Database with Row-Level Security
* **Realtime Gateway**: Asynchronous WebSocket event broadcasting
* **Data Validation**: Pydantic v2
* **Authentication**: Industry-standard JSON Web Tokens (JWT)

---

## 📂 Repository Structure

```text
CampusFlow/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Environment configuration loader
│   ├── requirements.txt         # Backend Python dependencies
│   ├── routers/                 # Modular API endpoints
│   │   ├── auth.py              # Authentication & user profile endpoints
│   │   ├── appointments.py      # Scheduling & reservation endpoints
│   │   ├── queue.py             # Queue operations & ticket lifecycle
│   │   ├── admin.py             # Admin analytics & office config
│   │   ├── ai.py                # AI virtual guide integration
│   │   ├── messages.py          # Staff-student communication
│   │   └── school_records.py    # Academic record management
│   └── services/                # Core business logic layer
│       ├── auth_service.py
│       ├── appointment_service.py
│       ├── queue_service.py
│       ├── admin_service.py
│       ├── ai_service.py
│       └── websocket_manager.py # Real-time broadcast engine
│
└── frontend/
    ├── package.json             # Frontend dependencies and scripts
    ├── vite.config.js           # Vite build and development configuration
    └── src/
        ├── App.jsx              # Root component & state providers
        ├── routes/              # Client-side route declarations
        ├── context/             # Auth and WebSocket global providers
        ├── components/          # Reusable UI elements & layout shells
        ├── services/            # Client-side API service connectors
        └── pages/
            ├── auth/            # Sign In, Registration, Password Recovery
            ├── student/         # Student Portal views
            ├── staff/           # Staff Counter views
            └── admin/           # Admin Dashboard views
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher) and **npm**
* **Python** (v3.11 or higher)
* **PostgreSQL** Database instance

---

### Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local environment configuration:
   Create a `.env` file in the `backend/` directory referencing `.env.example`:
   ```env
   # Database Configuration
   DATABASE_URL=your_database_connection_url

   # Authentication
   SECRET_KEY=your_jwt_secret_key
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:5173

   # Optional AI Integration
   AI_SERVICE_API_KEY=your_optional_api_key
   ```

5. Start the backend API server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000`.

---

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure local environment variables:
   Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Launch the local development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## 👥 User Roles & Permissions

| Role | Target Users | Allowed Access |
| :--- | :--- | :--- |
| **`student`** | Enrolled / Active Students | Self-service dashboard, appointment booking, queue ticket status, priority lane verification, AI assistant. |
| **`staff`** | Registrar Window Officers | Service window assignment, live queue calling, appointment check-ins, document release desk, academic records lookup. |
| **`admin`** | Registrar Head / System Admins | System KPIs, queue monitoring, office schedule configuration, transaction management, user role assignment, audit logs. |

---

## 🧪 Pilot Testing Phase

A structured Pilot Testing Phase Guide is available in the repository root:
* **[CampusFlow_Pilot_Testing_User_Flow_Guide.pdf](./CampusFlow_Pilot_Testing_User_Flow_Guide.pdf)** — Complete operational workflow, step-by-step user testing scenarios, success metrics, and evaluation rubric for Students, Staff, and Administrators.

---

## 📄 License & Attribution

Developed as an academic capstone and administrative modernization system. All rights reserved by the CampusFlow Project Team.
