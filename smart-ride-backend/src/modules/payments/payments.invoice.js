// ========== FILE: src/modules/payments/payments.invoice.js ==========
/**
 * Generates a random invoice number in format SR-YYYYMMDD-XXXX
 * @returns {string} The formatted invoice number
 */
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random4Digit = Math.floor(1000 + Math.random() * 9000);
  
  return `SR-${year}${month}${day}-${random4Digit}`;
};

/**
 * Generates an HTML invoice string.
 * @param {Object} data Invoice data object
 * @returns {string} Complete HTML document
 */
const generateInvoiceHTML = (data) => {
  const {
    invoice_number,
    invoice_date,
    payment_id,
    razorpay_payment_id,
    user,
    subscription,
    route,
    driver,
    vehicle,
    amount,
    currency,
    payment_method,
    payment_status
  } = data;

  const dateStr = new Date(invoice_date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const slots = [];
  if (subscription.morning_slot) slots.push('Morning');
  if (subscription.evening_slot) slots.push('Evening');
  const slotsStr = slots.join(' & ') || 'None';

  const subtotal = Math.round(amount / 1.18);
  const gst = amount - subtotal;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice_number}</title>
  <style>
    :root {
      --primary: #2563EB; /* Electric Blue */
      --secondary: #0F172A; /* Dark Navy */
      --gray-light: #F1F5F9;
      --gray-dark: #64748B;
      --success: #16A34A;
    }
    body {
      font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: #F8FAFC;
      color: #334155;
    }
    .invoice-container {
      max-width: 800px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: var(--primary);
      color: white;
      padding: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo {
      width: 50px;
      height: 50px;
      background: white;
      color: var(--primary);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 800;
      font-size: 24px;
    }
    .company-details h1 {
      margin: 0 0 5px 0;
      font-size: 24px;
    }
    .company-details p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      margin: 0;
      font-size: 32px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .invoice-title p {
      margin: 5px 0 0 0;
      font-size: 14px;
    }
    .content {
      padding: 40px;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .section-title {
      color: var(--secondary);
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid var(--gray-light);
      padding-bottom: 5px;
    }
    .customer-info p, .invoice-info p {
      margin: 5px 0;
      font-size: 15px;
    }
    .customer-info strong, .invoice-info strong {
      color: var(--secondary);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
    }
    th {
      background-color: var(--gray-light);
      color: var(--secondary);
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid var(--gray-light);
      font-size: 15px;
    }
    .summary-box {
      width: 300px;
      float: right;
      background: var(--gray-light);
      padding: 20px;
      border-radius: 8px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 15px;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #CBD5E1;
      font-size: 20px;
      font-weight: 800;
      color: var(--secondary);
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      background-color: #DCFCE7;
      color: var(--success);
      font-weight: 700;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: var(--gray-dark);
      font-size: 14px;
      border-top: 1px solid var(--gray-light);
      margin-top: 50px;
    }
    .btn-print {
      display: block;
      width: 200px;
      margin: 20px auto;
      padding: 12px;
      background: var(--primary);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-size: 16px;
    }
    .btn-print:hover {
      background: #1D4ED8;
    }
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
    @media print {
      body { background: white; }
      .invoice-container { box-shadow: none; margin: 0; max-width: 100%; }
      .btn-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-container">
        <div class="logo">SR</div>
        <div class="company-details">
          <h1>Smart Ride Transport Services</h1>
          <p>support@smartride.in | www.smartride.in</p>
        </div>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p>#${invoice_number}</p>
      </div>
    </div>

    <div class="content">
      <div class="flex-row">
        <div class="customer-info">
          <div class="section-title">Billed To</div>
          <p><strong>${user.full_name}</strong></p>
          <p>${user.email}</p>
          <p>+91 ${user.phone}</p>
        </div>
        <div class="invoice-info" style="text-align: right;">
          <p><strong>Invoice Date:</strong> ${dateStr}</p>
          <p><strong>Payment ID:</strong> ${payment_id.split('-')[0]}...</p>
          <div class="status-badge">PAID</div>
        </div>
      </div>

      <div class="section-title">Subscription Details</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Plan</strong></td>
            <td>${subscription.plan_name} (${subscription.plan_type.toUpperCase()})</td>
          </tr>
          <tr>
            <td><strong>Duration</strong></td>
            <td>${subscription.duration_days} Days (${subscription.start_date.split('T')[0]} to ${subscription.end_date.split('T')[0]})</td>
          </tr>
          <tr>
            <td><strong>Route</strong></td>
            <td>${route.route_name} (${route.city})</td>
          </tr>
          <tr>
            <td><strong>Slots</strong></td>
            <td>${slotsStr}</td>
          </tr>
          <tr>
            <td><strong>Pickup Location</strong></td>
            <td>${subscription.pickup_address}</td>
          </tr>
          <tr>
            <td><strong>Drop Location</strong></td>
            <td>${subscription.drop_address}</td>
          </tr>
        </tbody>
      </table>

      ${driver && vehicle ? `
      <div class="section-title">Assigned Driver & Vehicle</div>
      <table>
        <tbody>
          <tr>
            <td width="30%"><strong>Driver</strong></td>
            <td>${driver.full_name} (+91 ${driver.phone})</td>
          </tr>
          <tr>
            <td><strong>Vehicle</strong></td>
            <td>${vehicle.brand} ${vehicle.model} (${vehicle.vehicle_number})</td>
          </tr>
        </tbody>
      </table>
      ` : '<p style="color: #64748B; font-size: 14px; font-style: italic;">Driver will be assigned shortly.</p>'}

      <div class="clearfix">
        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>GST (18%)</span>
            <span>₹${gst.toFixed(2)}</span>
          </div>
          <div class="summary-row" style="margin-top: 15px; font-size: 13px; color: #64748B;">
            <span>Payment Method</span>
            <span>${payment_method ? payment_method.toUpperCase() : 'ONLINE'}</span>
          </div>
          <div class="summary-row" style="font-size: 13px; color: #64748B;">
            <span>Transaction ID</span>
            <span>${razorpay_payment_id || 'N/A'}</span>
          </div>
          <div class="summary-total">
            <span>Total</span>
            <span>₹${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      Thank you for choosing Smart Ride! For any queries, contact support@smartride.in
    </div>
  </div>

  <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
</body>
</html>
  `;
};

module.exports = {
  generateInvoiceNumber,
  generateInvoiceHTML
};
// ========== END ==========
