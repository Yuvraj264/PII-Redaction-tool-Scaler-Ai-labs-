# PII Redaction Tool

A production-quality PII (Personally Identifiable Information) Redaction Tool built for the Scaler AI Labs Environment Data assignment.

## Tech Stack

- **Frontend**: React, JavaScript (JSX), Vanilla CSS, Vite
- **Backend**: Node.js, Express.js, JavaScript
- **Database**: MongoDB (Mongoose driver)
- **Architecture**: MERN Stack (Pure JavaScript — strictly NO TypeScript)

## Project Structure

```
scaler ai labs Pii engine/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── App.jsx        # App container
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Design system & styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                 # Express backend application
│   ├── src/
│   │   ├── config/        # Environment & DB configurations
│   │   ├── controllers/   # Route handler controllers
│   │   ├── middleware/    # Error handling & custom middleware
│   │   ├── models/        # Mongoose data models
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Business logic services
│   │   ├── utils/         # Utility functions
│   │   └── app.js         # Express app instantiation
│   ├── server.js          # HTTP server startup entry point
│   ├── .env.example
│   └── package.json
│
├── docs/                   # System architecture documentation
├── flow.md                 # System flow & execution state
├── context.md              # Engineering decisions & execution logs
├── README.md
└── .gitignore
```

## Quick Start

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm start
```
The server will run at `http://localhost:5000`. Test health status at `http://localhost:5000/api/health`.

### Frontend Setup

```bash
cd client
npm install
npm run dev
```
The frontend will run at `http://localhost:5173`.

## System Documentation

- **[flow.md](flow.md)**: Details the current execution flow (`FLOW-001`) and separates implemented vs planned components.
- **[context.md](context.md)**: Tracks execution history, design decisions, command results, and risks.
