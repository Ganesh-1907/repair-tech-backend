# RepairTech Backend

Node.js + Express + MongoDB API for the RepairTech frontend.

## Setup

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Default MongoDB URL:

```text
mongodb://localhost:27017/repairboy
```

## Default Login

```text
email: ganesh.bora@gmail.com
password: Ganesh@1907
```

Staff records created from Staff Listing also receive login access:

```text
email: staff record email
password: staff@123
```

## Main Endpoints

- `POST /api/auth/login`
- `GET /api/health`
- `GET|POST /api/records/:collection`
- `GET|PUT|PATCH|DELETE /api/records/:collection/:id`
- `GET /api/inventory/stats`
- `PATCH /api/inventory/:id/stock`
- `GET /api/assets/stats`
- `GET /api/dashboard/summary`
- `GET /api/staff/stats`
- `POST /api/staff/assign-job`
- `GET /api/rental/state`
- `POST /api/rental/payments`

Seed data is inserted automatically the first time the backend starts.
By default this creates only the admin user, so production/local reset does not bring back demo AMC, CMC, rental, lead, staff, or invoice rows.

You can also seed manually:

```bash
npm run seed
npm run seed:reset
```

To intentionally load demo module data for UI testing:

```bash
npm run seed:demo
npm run seed:reset:demo
```
# repair-tech-backend
