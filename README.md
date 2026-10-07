# SupplyChainIQ

### AI-Powered Supply Chain Procurement Intelligence Platform

SupplyChainIQ is an enterprise-style supply chain intelligence platform that brings procurement, inventory, demand, supplier, and logistics data into a unified operational control tower.

It helps supply chain teams monitor KPIs, identify risks, analyze operational data, simulate disruptions, and make data-driven decisions.

---

## 🚀 Features

### Control Tower
- Executive supply chain KPIs
- Inventory and procurement exposure
- Supplier risk monitoring
- Logistics and shipment visibility
- Priority incidents and operational alerts

### Inventory Control
- Stock health analysis
- Safety stock and reorder monitoring
- Inventory coverage
- Replenishment recommendations
- SKU-level analysis

### Demand Planning
- Historical demand analysis
- Forecasting
- Forecast accuracy, MAPE and bias
- Forward demand projections

### Supplier Network
- Supplier performance tracking
- OTIF and defect PPM
- Supplier risk scoring
- Spend-at-risk analysis

### Logistics Control Tower
- Shipment tracking
- ETA and delay monitoring
- Freight spend analysis
- Transport mode and lane analysis

### Procurement Control
- Purchase-order monitoring
- Procurement spend analysis
- Supplier and category concentration
- Savings opportunities

### Scenario Lab
Simulates supply chain disruptions such as demand surges, lead-time delays, and freight-rate changes to evaluate potential financial impact.

---

## 🔄 Data Pipeline

SupplyChainIQ follows an upload-first, database-driven workflow:

```text
CSV / XLSX
     ↓
Parsing & Validation
     ↓
PostgreSQL
     ↓
Kafka Events
     ↓
Redis Cache / Operational State
     ↓
Live Analytics & Decisions
     ↓
Grafana Observability
````

Supported datasets:

* Product Master
* Supplier Scorecard
* Stock Positions
* Demand History
* Purchase Orders
* Shipments & Freight

---

## 🏗️ Architecture

```text
                 SupplyChainIQ
                       │
              ┌────────┴────────┐
              │                 │
         PostgreSQL           Kafka
        Source of Truth    Event Streaming
              │                 │
              └────────┬────────┘
                       ↓
                    Redis
               Cache / State
                       │
                       ↓
                Application UI
                       │
                       ↓
                   Grafana
               Observability
```

Operational events can flow between procurement, inventory, logistics, alerts, and decision-support workflows.

Example:

```text
Inventory Shortage
       ↓
Replenishment Recommendation
       ↓
Purchase Order
       ↓
Kafka Event
       ↓
Shipment / Inventory Consumers
       ↓
Redis
       ↓
Control Tower
```

---

## 🔐 Security

* Supabase Authentication
* PostgreSQL
* Row Level Security (RLS)
* Workspace-scoped data
* Role-based access control
* Server-side workspace resolution

---

## 🛠️ Tech Stack

**Frontend**

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Recharts

**Data & Backend**

* Supabase
* PostgreSQL
* Row Level Security

**Event & Performance Layer**

* Apache Kafka
* Redis

**Observability**

* Grafana

**Data Processing**

* CSV/XLSX
* SheetJS
* PapaParse
* Zod

---

## 🖥️ Run Locally

```bash
git clone https://github.com/aditisprasad/SupplyChainIQ.git
cd SupplyChainIQ
npm install
npm run dev
```

Configure the required environment variables in `.env.local`.

Build:

```bash
npm run build
```

---

## 🎯 Project Goals

SupplyChainIQ is designed around:

* Data-driven supply chain decisions
* Real-time operational visibility
* Event-driven workflows
* Scalable data processing
* Multi-tenant security
* Actionable recommendations
* Production-oriented observability

---

## 👩‍💻 Author

**Aditi S Prasad**

B.Tech Computer Science & Software Engineering
Jain University, Bengaluru

[GitHub](https://github.com/aditisprasad) · [LinkedIn](https://linkedin.com/in/aditi-prasad-678808299)

```


