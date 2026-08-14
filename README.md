# 🚗 ParkShare

### Peer-to-Peer Parking Marketplace

ParkShare is a full-stack web application that connects **parking space owners** with **drivers looking for convenient and secure parking**.

Owners can list their unused parking spaces, while drivers can discover available spaces, view details, request bookings, and manage their reservations through a single platform.

---

## 📌 Problem

Finding convenient parking can be difficult, especially in crowded areas where available spaces are limited.

At the same time, many privately owned parking spaces remain unused for large parts of the day.

**ParkShare connects these two sides of the problem:**

```text
Parking Space Owner                  Driver
       │                               │
       │  Unused parking space         │  Needs parking
       │                               │
       └──────────────┬────────────────┘
                      │
                      ▼
                  ParkShare
                      │
                      ▼
              Discover → Book
                      │
                      ▼
             Secure Parking
```

---

# ✨ Features

## 🔐 Authentication & Authorization

* User registration and login
* JWT-based authentication
* Role-based access control
* Driver and Owner workflows
* Protected frontend routes
* Secured REST APIs

## 🅿️ Parking Space Management

Owners can:

* Add parking spaces
* Provide parking details and pricing
* Set location information
* Upload parking space images
* Manage their listed spaces

## 🗺️ Parking Discovery

Drivers can:

* Browse available parking spaces
* View parking details
* Explore locations using an interactive map
* Select suitable parking spaces based on availability and requirements

## 📅 Booking Management

Drivers can:

* Request parking bookings
* Track booking status
* View booking history

Owners can:

* View incoming booking requests
* Accept or reject requests
* Manage their bookings

The backend also validates booking conflicts to prevent overlapping reservations.

## 💳 Payments

ParkShare includes the payment workflow required for booking transactions, including payment order creation and verification.

The payment flow is currently being finalized and hardened for production use.

## 📊 Dashboards

### Driver Dashboard

* Available parking spaces
* Booking information
* Booking history
* Reservation status

### Owner Dashboard

* Listed parking spaces
* Incoming booking requests
* Booking management
* Earnings information
* Transaction overview
* Calendar-based booking view

## ☁️ Image Management

Parking space images are handled through **Cloudinary**, keeping image storage separate from the application server.

## 📄 Receipts

The backend includes PDF generation support for transaction/receipt-related workflows.

---

# 🏗️ System Architecture

```text
                         ┌───────────────────────┐
                         │       Driver          │
                         │       / Owner         │
                         └───────────┬───────────┘
                                     │
                                     │ HTTP / REST
                                     ▼
                    ┌──────────────────────────────┐
                    │       React Frontend         │
                    │                              │
                    │  Authentication              │
                    │  Dashboards                  │
                    │  Parking Discovery           │
                    │  Booking                     │
                    │  Maps                        │
                    │  Payments                    │
                    └──────────────┬───────────────┘
                                   │
                                   │ Axios / REST API
                                   ▼
                    ┌──────────────────────────────┐
                    │       Spring Boot API         │
                    │                              │
                    │  Controllers                 │
                    │       ↓                      │
                    │  Services                    │
                    │       ↓                      │
                    │  Repositories                │
                    │       ↓                      │
                    │  PostgreSQL                  │
                    │                              │
                    │  Spring Security + JWT       │
                    └───────┬──────────┬───────────┘
                            │          │
                ┌───────────┘          └────────────┐
                ▼                                    ▼
       ┌─────────────────┐                  ┌─────────────────┐
       │   Cloudinary    │                  │    Razorpay     │
       │ Image Storage   │                  │    Payments     │
       └─────────────────┘                  └─────────────────┘
```

---

# 🔄 Application Flow

## Driver Booking Flow

```text
Register / Login
       │
       ▼
Driver Dashboard
       │
       ▼
Discover Parking Spaces
       │
       ▼
View Parking Details
       │
       ▼
Select Booking Details
       │
       ▼
Create Booking Request
       │
       ▼
     PENDING
       │
       ▼
Owner Reviews Request
       │
       ├───────────────┐
       ▼               ▼
   ACCEPTED         REJECTED
       │
       ▼
   Payment
       │
       ▼
Booking Confirmation
```

## Owner Flow

```text
Register / Login
       │
       ▼
Owner Dashboard
       │
       ▼
Create Parking Space
       │
       ├── Details
       ├── Location
       ├── Pricing
       └── Images
              │
              ▼
        Parking Listing
              │
              ▼
       Receive Booking
              │
              ▼
       Accept / Reject
              │
              ▼
       Manage Earnings
```

---

# 🧩 Tech Stack

## Frontend

| Technology         | Purpose                |
| ------------------ | ---------------------- |
| React              | User interface         |
| Vite               | Frontend build tooling |
| React Router       | Client-side routing    |
| Tailwind CSS       | Styling                |
| Axios              | REST API communication |
| React Leaflet      | Map integration        |
| React Big Calendar | Booking calendar       |
| Recharts           | Dashboard analytics    |
| Lucide React       | UI icons               |

## Backend

| Technology         | Purpose                        |
| ------------------ | ------------------------------ |
| Java 21            | Backend language               |
| Spring Boot        | Backend framework              |
| Spring Web         | REST APIs                      |
| Spring Data JPA    | Database access                |
| Spring Security    | Authentication & authorization |
| JWT                | Stateless authentication       |
| Jakarta Validation | Request validation             |
| Lombok             | Boilerplate reduction          |

## Database & External Services

| Technology     | Purpose                      |
| -------------- | ---------------------------- |
| PostgreSQL     | Application database         |
| H2             | Development/testing database |
| Cloudinary     | Image storage                |
| Razorpay       | Payment integration          |
| iText          | PDF generation               |
| Docker Compose | Local infrastructure         |

---

# 📁 Project Structure

```text
ParkShare/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   ├── pom.xml
│   └── mvnw.cmd
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install the following before running ParkShare:

* Java 21
* Node.js
* npm
* Docker Desktop
* Git

You will also need credentials for the external services used by the application.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Sajju16/ParkShare.git

cd ParkShare
```

---

# 2. Configure Environment Variables

The repository contains an `.env.example` file showing the environment configuration required by the project.

Create your local environment configuration and provide the required values for:

```text
Database
JWT
Cloudinary
Payment Gateway
```

### Important

Do **not** commit real API keys, passwords, JWT secrets, or other credentials to GitHub.

---

# 3. Start PostgreSQL

The project includes Docker Compose configuration for local infrastructure.

From the project root:

```bash
docker compose up -d
```

Verify that the required containers are running:

```bash
docker compose ps
```

---

# 4. Start the Backend

Open a terminal:

```bash
cd backend
```

### Windows

```bash
mvnw.cmd spring-boot:run
```

### Linux / macOS

```bash
./mvnw spring-boot:run
```

The Spring Boot application will start using the configured database and environment variables.

---

# 5. Start the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will display the local frontend URL in the terminal.

Open that URL in your browser.

---

# 🧪 How to Use ParkShare

Once both frontend and backend are running, the application can be tested using two user roles.

## 👤 Test as Driver

### Step 1 — Register

Create a new account and select the **Driver** role.

### Step 2 — Login

Login using the registered credentials.

### Step 3 — Discover Parking

Browse available parking spaces and open a listing to view its details.

### Step 4 — Create a Booking

Select the required booking details and submit a booking request.

The booking initially enters:

```text
PENDING
```

### Step 5 — Wait for Owner Action

The owner can review the request and either:

```text
ACCEPT
   or
REJECT
```

### Step 6 — Payment

For an accepted booking, proceed through the available payment flow.

---

# 👤 Test as Owner

Create another account using the **Owner** role.

### Step 1 — Login

Login to access the Owner Dashboard.

### Step 2 — Add Parking Space

Create a parking listing with:

* Parking details
* Location
* Pricing
* Images

### Step 3 — Manage Requests

When a driver creates a booking request, it appears in the Owner Dashboard.

The owner can:

```text
View Request
     │
     ├── Accept
     │
     └── Reject
```

### Step 4 — Track Earnings

Accepted bookings and payment-related information can be viewed through the earnings/transaction dashboard.

---

# 🔒 Security

ParkShare uses:

* JWT authentication
* Spring Security
* Role-based authorization
* Protected REST endpoints
* Request validation
* Environment-based secrets

Sensitive credentials should always be provided through environment variables rather than committed to source control.

---

# 🐳 Docker

Docker Compose is included to simplify local infrastructure setup.

```bash
docker compose up -d
```

To stop the containers:

```bash
docker compose down
```

---

# 📌 Current Project Status

ParkShare is an actively developed project.

The core marketplace, authentication, parking space management, booking workflow, dashboards, and supporting integrations are implemented. The payment flow is being finalized along with remaining production-level refinements.

---

# 🔮 Future Improvements

* Complete and harden the payment workflow
* Production deployment
* Enhanced notifications
* Additional booking edge-case handling
* Improved analytics
* Further UI/UX refinement
* Additional production monitoring and reliability improvements

---

# 👨‍💻 Author

**Sajjaad Hussain**

BE Computer Science & Engineering

GitHub: https://github.com/Sajju16
