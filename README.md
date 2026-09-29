# EVGRID 

Full-stack EV Station Management Portal built with:
- HTML/CSS/JavaScript frontend
- Node.js + Express backend
- Neon PostgreSQL database
- JWT authentication
- Simulated EV charging telemetry
- Alerts, analytics and demo AI predictions

## Run on Windows

```powershell
cd "C:\path\to\EVGRID-Portal"
Copy-Item .\backend\.env.example .\backend\.env
npm --prefix backend install
npm run dev
```

Open `http://localhost:5000`.

## Neon database

Run `database/schema.sql` and then `database/seed.sql` in the Neon SQL Editor.
Set the Neon connection string as `DATABASE_URL` in `backend/.env`.
