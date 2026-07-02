const generateInvoiceHTML = (payment, subscription, user, driver, vehicle) => {
  const dateStr = new Date(payment.created_at || new Date()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const startDateStr = new Date(subscription.start_date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  
  const endDateStr = new Date(subscription.end_date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // Calculate breakdown for display
  const distance = subscription.distance_km || 0;
  const rate = subscription.per_km_rate_used || 0;
  const mult = subscription.vehicle_multiplier_used || 1.0;
  const base = subscription.base_fare_used || 500;
  
  // Just show the math: (Distance * Rate * Mult) + Base = Subtotal_per_month
  // Let's rely on the payment object's amount since it might have been shared.
  const amount = Number(payment.amount);
  const gst = Number(payment.gst_amount || (amount - (amount / 1.18)));
  const subtotal = amount - gst;

  // Let's create the HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1f2937; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; position: relative; }
    .logo { color: #2563EB; font-size: 28px; font-weight: 800; letter-spacing: -1px; margin: 0; }
    .company-details { text-align: right; font-size: 14px; color: #6b7280; }
    .invoice-title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 5px; }
    
    .paid-stamp {
      position: absolute; top: 10px; right: 250px;
      color: #10B981; font-weight: 900; font-size: 32px;
      border: 4px solid #10B981; border-radius: 8px;
      padding: 5px 15px; transform: rotate(15deg);
      opacity: 0.8; letter-spacing: 2px;
    }

    .section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .col { flex: 1; }
    .col h3 { font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px; margin-bottom: 10px; }
    .col p { margin: 2px 0; font-size: 15px; }
    .bold { font-weight: 600; color: #111827; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; background: #f9fafb; padding: 12px; font-size: 13px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    td { padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
    .text-right { text-align: right; }
    
    .breakdown-box { width: 350px; margin-left: auto; background: #f9fafb; border-radius: 8px; padding: 20px; }
    .breakdown-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #4b5563; }
    .breakdown-total { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-weight: 700; font-size: 18px; color: #111827; }

    .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #6b7280; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    
    @media print {
      body { padding: 0; }
      .paid-stamp { border-color: #10B981 !important; color: #10B981 !important; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1 class="logo">Smart Ride</h1>
      <div class="invoice-title">INVOICE</div>
      <p class="bold" style="margin:5px 0;">${payment.invoice_number}</p>
      <p style="color:#6b7280; margin:0;">Date: ${dateStr}</p>
    </div>
    <div class="company-details">
      <p class="bold">Smart Ride India Pvt Ltd</p>
      <p>123 Tech Park, Sector 45</p>
      <p>Gurugram, Haryana 122003</p>
      <p>GSTIN: 06AAACA1234A1Z5</p>
    </div>
    <div class="paid-stamp">PAID</div>
  </div>

  <div class="section">
    <div class="col">
      <h3>Billed To</h3>
      <p class="bold">${user.full_name}</p>
      <p>${user.email}</p>
      <p>${user.phone}</p>
    </div>
    <div class="col">
      <h3>Subscription Reference</h3>
      <p class="bold">Plan: <span style="text-transform:capitalize;">${subscription.plan_type}</span> Subscription</p>
      <p>Period: ${startDateStr} &rarr; ${endDateStr}</p>
      <p>Vehicle: ${subscription.preferred_vehicle_type || (vehicle ? vehicle.brand : 'Standard')}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Route Details</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="bold">Daily Commute Subscription</div>
          <div style="font-size:13px; color:#6b7280; margin-top:4px;">
            Driver: ${driver && driver.full_name ? driver.full_name : 'Assigned shortly'}<br>
            Vehicle: ${vehicle && vehicle.brand ? vehicle.brand + ' ' + vehicle.model + ' | ' + vehicle.vehicle_number : 'Assigned shortly'}
          </div>
        </td>
        <td>
          <div><strong>From:</strong> ${subscription.pickup_address}</div>
          <div style="margin-top:5px;"><strong>To:</strong> ${subscription.drop_address}</div>
          <div style="font-size:13px; color:#6b7280; margin-top:4px;">Distance: ${distance} km</div>
        </td>
        <td class="text-right bold">
          ₹${amount.toFixed(2)}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="breakdown-box">
    <div class="breakdown-row">
      <span>Rate per km</span>
      <span>₹${Number(rate).toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Vehicle Multiplier</span>
      <span>${Number(mult).toFixed(1)}&times;</span>
    </div>
    <div class="breakdown-row">
      <span>Base Fare</span>
      <span>₹${Number(base).toFixed(2)}</span>
    </div>
    <div class="breakdown-row" style="margin-top: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
      <span>Subtotal</span>
      <span>₹${subtotal.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>GST (18%)</span>
      <span>₹${gst.toFixed(2)}</span>
    </div>
    <div class="breakdown-total">
      <span>TOTAL PAID</span>
      <span>₹${amount.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p class="bold">Thank you for choosing Smart Ride!</p>
    <p>For support, please contact us at support@smartride.in or visit www.smartride.in</p>
    <p style="font-size:12px; margin-top:10px;">This is a computer generated invoice and does not require a physical signature.</p>
  </div>

</body>
</html>
  `;
};

module.exports = {
  generateInvoiceHTML
};
