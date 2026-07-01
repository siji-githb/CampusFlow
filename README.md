# CampusFlow

> **An AI-Based Web Appointment and Queue Management System for College Registrar Transactions**

CampusFlow is a full-stack web application designed to modernize and streamline the day-to-day operations of a college registrar's office. It replaces traditional walk-in queues and paper-based scheduling with a digital platform that serves students, registrar staff, and administrators — each with a purpose-built interface.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Student Portal](#student-portal)
  - [Staff Portal](#staff-portal)
  - [Admin Portal](#admin-portal)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Roles & Access Control](#roles--access-control)
- [AI Features](#ai-features)

---

## Overview

CampusFlow addresses the common pain points of a college registrar: long walk-in queues, missed appointments, and lack of transparency. The system provides:

- **Real-time queue tracking** for walk-in students
- **Online appointment booking** for scheduled transactions
- **AI-powered chat assistance** for student inquiries
- **Window-based service management** for registrar staff
- **Administrative dashboards** with reports, audit logs, and office configuration

---

## Features

### Student Portal

| Feature | Description |
|---|---|
| **Dashboard** | Personalized overview of active queue position, upcoming appointments, and quick actions |
| **Book Appointment** | Multi-step appointment booking form with date/time slot selection and transaction type |
| **My Appointments** | View, track, and cancel scheduled appointments |
| **My Queue** | Real-time status of an active walk-in queue ticket, including position and serving window |
| **AI Chat Assistant** | Ask questions about registrar procedures, document requirements, and schedules |

### Staff Portal

| Feature | Description |
|---|---|
| **Dashboard** | Live overview of today's queue activity, completion stats, and pending appointments |
| **Window Assignment** | Staff must claim a service window before starting work; enforced one-to-one mapping |
| **Live Queue Management** | View, call, serve, skip, and complete walk-in queue tickets in real time |
| **Appointments Page** | Manage scheduled student appointments and mark them as completed or no-show |
| **Student Records** | Look up and view student academic records for transaction processing |
| **Messages** | Receive and respond to messages from students |

### Admin Portal

| Feature | Description |
|---|---|
| **Dashboard** | System-wide KPIs: total users, daily volume, completion rates, and staff activity |
| **Reports** | AI-generated daily summaries with filterable statistics and downloadable data |
| **Appointments Management** | View all appointments across students and staff; release or manage dates |
| **Live Queue Monitor** | Real-time view of all active queue windows and ticket states |
| **User Management** | Promote/demote users between student/staff/admin roles and activate/deactivate accounts |
| **Registrar Records** | Browse and edit all student academic records stored in the system |
| **Office Configuration** | Set operating hours, slot durations, booking cutoff days, staff count, and active windows |
| **Audit Log** | Immutable log of all administrative actions with timestamps and actor identity |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool and dev server |
| **Vanilla CSS (inline styles)** | Styling — no CSS framework dependency |
| **Lucide React** | Icon library |
| **Google Fonts** (IBM Plex Sans, Fraunces) | Typography |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **Supabase** | PostgreSQL database + Auth + Realtime |
| **OpenAI API** | AI chat assistant and report generation |
| **Pydantic** | Request/response validation |
| **python-jose / PyJWT** | JWT authentication |

---

## Project Structure

```
CampusFlow/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Environment settings
│   ├── render.yaml              # Render deployment config
│   ├── requirements.txt         # Python dependencies
│   ├── routers/
│   │   ├── admin.py             # Admin + window assignment endpoints
│   │   ├── appointments.py      # Appointment CRUD
│   │   ├── auth.py              # Login / register
│   │   ├── ai.py                # AI chat endpoint
│   │   ├── messages.py          # Staff-student messaging
│   │   ├── queue.py             # Queue ticket management
│   │   └── school_records.py    # Student academic records
│   └── services/
│       ├── admin_service.py     # Admin business logic + window assignments
│       ├── appointment_service.py
│       ├── ai_service.py
│       ├── messages_service.py
│       └── queue_service.py
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Landing.jsx          # Public landing page
        │   ├── auth/                # Login & Register
        │   ├── student/             # Student portal pages
        │   ├── staff/               # Staff portal pages
        │   └── admin/               # Admin portal pages
        ├── components/
        │   └── layout/              # StudentLayout, StaffLayout, etc.
        └── services/                # API call helpers (adminService.js, etc.)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- A **Supabase** project (free tier works)
- An **OpenAI** API key

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create the .env file (see Environment Variables section)

# 5. Start the development server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the `backend/` directory with the following keys:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
SECRET_KEY=your-jwt-secret-key
```

> **Never commit your `.env` file.** It is listed in `.gitignore`.

---

## Deployment

### Backend — Render

The backend is configured for deployment on [Render](https://render.com) via `backend/render.yaml`.

```yaml
buildCommand: pip install -r requirements.txt
startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set the environment variables above in the Render dashboard under your service's **Environment** tab.

### Frontend — Vercel

The frontend is deployed on [Vercel](https://vercel.com). Connect the repository, set the root directory to `frontend`, and Vercel will auto-detect the Vite build configuration.

Allowed frontend origins are already whitelisted in the backend CORS configuration:
- `https://campus-flow.vercel.app`
- `https://campus-flow-iota.vercel.app`

---

## Roles & Access Control

CampusFlow enforces three user roles at the API level:

| Role | Access |
|---|---|
| `student` | Student portal only (queue, appointments, AI chat) |
| `staff` | Staff portal only (queue management, appointments, records, messages) |
| `admin` | Full access including admin dashboard, user management, and office configuration |

All protected endpoints verify a valid **Supabase JWT** via the `Authorization: Bearer <token>` header. Admin-only endpoints additionally check the `role` field in the `users` table. Window assignment endpoints require `staff` or `admin` role.

---

## AI Features

CampusFlow integrates OpenAI to provide:

1. **Student AI Chat** — A conversational assistant that answers questions about registrar transactions, required documents, and procedures. Responses are grounded in the specific transaction types configured in the system.

2. **Admin AI Reports** — The Reports page generates a daily natural-language summary of appointment statistics (completion rate, no-shows, volume trends) to help administrators make informed decisions.

---

## License

This project was developed as an academic capstone project. All rights reserved by the authors.
