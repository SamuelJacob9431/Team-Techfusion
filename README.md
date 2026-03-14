check main1 branch for final project
# CoreInventory

CoreInventory is a premium, full-stack inventory management system designed for enterprise-grade logistics and warehouse operations. It features a modern, high-contrast UI, real-time stock tracking, and professional-grade reporting tools.

## 🚀 Key Features

### 💎 Premium User Interface
- **Modern Aesthetics**: Built with a "Glass-morphism" design system and a deep oceanic color palette.
- **Dynamic Interactivity**: 
  - Interactive **Parallax Tilt** effects on dashboard cards.
  - Smooth **Framer Motion** page transitions and list animations.
  - Custom **Animated Logo** and branding elements.
- **Modern Typography**: Powered by the **Poppins** Google Font for maximum legibility.

### 📦 Inventory & Operations
- **Receipts & Deliveries**: Manage incoming and outgoing stock with status workflows (Draft, Waiting, Ready, Done).
- **Kanban View**: Visual workflow management grouped by status.
- **Search & Filter**: Real-time search by ID, Supplier, or Contact.
- **Direct Operations**: "Bypass Draft" feature for faster operational throughput.

### 🖨️ Professional Reporting
- **Robust Print System**: High-contrast, black-on-white print templates for Receipts and Deliveries.
- **Auto-filled Metadata**: Prints include auto-filled "Responsible Officer" details and secure session hashes for authenticity.
- **Isolated Print Scoping**: Specialized CSS ensures only the document content is sent to the printer.

### 🛠️ Technical Prowess
- **Backend Integrity**: SQLite-based persistence with dedicated controller logic and signed stock delta calculations.
- **Stock Adjustments**: Specific logic for Damaged Goods, Theft, or Missing Stock discovery, with manual override for "Other" reasons.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TailwindCSS, Framer Motion, React Icons.
- **Backend**: Node.js, Express, Better-SQLite3.
- **Authentication**: JWT-based secure authentication.

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd odoo
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=5001
JWT_SECRET=your_jwt_secret_here
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🏃 Running the Application

### Start Backend
```bash
cd backend
npm run dev
```
*Note: The backend runs on Port **5001** to avoid system conflicts.*

### Start Frontend
```bash
cd frontend
npm run dev
```
*The application should now be available at `http://localhost:5173`.*

## 🧪 Default Credentials
- **Email**: `test@example.com`
- **Password**: `password123`

---
*Created with ❤️ by the TechFusion Team*
