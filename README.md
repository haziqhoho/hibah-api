# PTPTN API

A comprehensive API for PTPTN document tracking and reporting with dual database support.

## 🚀 Features

### Database Support
- **Dual Database Configuration**: Supports both `ptptn` (UsraHDD) and `em2-ptptn` databases
- **Product ID Filtering**: All queries now filter by `product_id = 186` by default
- **Standardized Status Codes**: Uses standardized status codes (0001-0030)

### Existing Features
- Document tracking with advanced filtering
- Hibah summary reports with export options (JSON, CSV, Excel)
- Tokenization service for sensitive data

## 📋 Requirements

- Node.js (v14 or higher)
- MySQL database
- Both `ptptn` and `em2-ptptn` databases configured

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ptptn-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=test_api_key_12345
   TOKENIZATION_KEY=my_secret_tokenization_key_2024
   PORT=3000
   
   # Original ptptn database (UsraHDD)
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=ptptn
   DB_PORT=3306
   
   # New em2-ptptn database
   EM2_DB_HOST=localhost
   EM2_DB_USER=root
   EM2_DB_PASSWORD=your_password_here
   EM2_DB_NAME=em2-ptptn
   EM2_DB_PORT=3306
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## 📡 API Endpoints

### Health Check
- `GET /` - API health check

### Document Tracking
- `GET /document-tracking` - Get document tracking data
  - **Query Parameters:**
    - `product_id` (default: 186)
    - `status` - Document status
    - `type` - 'physical' or 'digital'
    - `date_from` - Start date filter
    - `date_to` - End date filter
    - `page` - Page number (default: 1)
    - `pageSize` - Items per page (default: 15)

### Reports
- `GET /reports/hibah-summary` - Get hibah summary report
  - **Query Parameters:**
    - `format` - 'json', 'csv', or 'xlsx' (default: 'json')

## 🔧 Configuration

### Database Configuration
The API uses two separate database connections:

1. **ptptn database** (UsraHDD) - For document tracking and hibah data
2. **em2-ptptn database** - For quotation and payment data

### Status Codes
Standardized status codes used throughout the API:
- `0001` - Valid
- `0002` - Pending
- `0003` - Rejected
- `0004` - Incomplete
- `0005` - Approved
- `0006` - Closed

## 📁 Project Structure

```
ptptn-api/
├── src/
│   ├── config/
│   │   └── db.js                 # Database configuration (dual DB support)
│   ├── controllers/
│   │   ├── documentTrackingController.js  # Updated with product_id filtering
│   │   └── reportsController.js           # Updated with new DB config
│   ├── routes/
│   │   ├── documentTracking.js
│   │   └── reports.js
│   ├── services/
│   │   └── tokenizationService.js
│   ├── app.js                    # Updated with new routes
│   └── server.js
├── .env                          # Environment configuration
└── README.md
```

## 📞 Support

For questions or issues, please contact the development team.

---

**Last Updated**: January 2025
**Version**: 1.0.0 