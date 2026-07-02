const crypto = require('crypto');
const Razorpay = require('razorpay');
const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const subscriptionsService = require('../subscriptions/subscriptions.service');

// We'll require invoice later or handle gracefully if not implemented yet
let invoiceUtils;
try {
  invoiceUtils = require('../../utils/invoice');
} catch (e) {
  logger.warn('invoice utils not found yet');
}

const getIo = () => {
  try {
    const { getIO } = require('../../socket/index');
    return getIO();
  } catch (e) {
    return null;
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});

const createRazorpayOrder = async (userId, planId) => {
  try {
    // 1. Get subscription plan -> verify belongs to userId, status='waiting_payment'
    const planResult = await query(`
      SELECT sp.*, u.full_name, u.email, u.phone 
      FROM subscription_plans sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.id = $1
    `, [planId]);

    if (planResult.rows.length === 0) throw new Error('PLAN_NOT_FOUND');
    const plan = planResult.rows[0];

    if (plan.user_id !== userId) throw new Error('UNAUTHORIZED');
    if (plan.status !== 'waiting_payment') throw new Error('INVALID_STATUS');

    // 2. Check no existing successful payment for this plan
    const checkPayment = await query(`
      SELECT id FROM payments WHERE subscription_plan_id = $1 AND status = 'success'
    `, [planId]);
    if (checkPayment.rows.length > 0) throw new Error('ALREADY_PAID');

    // 3. Create Razorpay order
    const amount = Number(plan.total_amount);
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: plan.id.substring(0, 8),
      notes: {
        plan_id: plan.id,
        user_id: userId,
        plan_type: plan.plan_type
      }
    });

    // 4. INSERT into payments with status='pending', razorpay_order_id
    await query(`
      INSERT INTO payments (user_id, subscription_plan_id, razorpay_order_id, amount, platform_commission, driver_amount, gst_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    `, [userId, planId, order.id, amount, plan.platform_commission, plan.driver_amount, plan.gst_amount]);

    // 5. Return
    return {
      order_id: order.id,
      amount: amount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      user_name: plan.full_name,
      user_email: plan.email,
      user_phone: plan.phone
    };
  } catch (error) {
    if (['PLAN_NOT_FOUND', 'UNAUTHORIZED', 'INVALID_STATUS', 'ALREADY_PAID'].includes(error.message)) throw error;
    logger.error('createRazorpayOrder error:', error);
    throw new Error('DB_ERROR');
  }
};

const verifyPaymentAndActivate = async (razorpayData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = razorpayData;

    // 1. Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error('INVALID_SIGNATURE');
    }

    // 2. Find payment by razorpay_order_id
    const paymentResult = await query('SELECT * FROM payments WHERE razorpay_order_id = $1', [razorpay_order_id]);
    if (paymentResult.rows.length === 0) throw new Error('PAYMENT_NOT_FOUND');
    const payment = paymentResult.rows[0];

    // 3. If already processed: return (idempotent)
    if (payment.status === 'success') return { success: true };

    // 4. UPDATE payments SET status='success' ...
    const paymentMethod = 'online'; // We can fetch from razorpay, simplified for now
    
    // 5. Generate invoice number: INV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const invoice_number = `INV-${dateStr}-${randomDigits}`;

    // 6. Calculate splits: PRD says: platform_commission = amount * 0.15, driver_amount = amount * 0.85
    // But since amount includes GST, we should probably follow the exact DB constraints if there are any,
    // or just use the PRD formula directly. Let's use the PRD formula.
    const amount = Number(payment.amount);
    const platform_commission = amount * 0.15;
    const driver_amount = amount * 0.85;

    // 7. UPDATE payments
    const updateResult = await query(`
      UPDATE payments 
      SET status = 'success', razorpay_payment_id = $1, razorpay_signature = $2, 
          payment_method = $3, platform_commission = $4, driver_amount = $5, invoice_number = $6
      WHERE id = $7
      RETURNING *
    `, [razorpay_payment_id, razorpay_signature, paymentMethod, platform_commission, driver_amount, invoice_number, payment.id]);
    const updatedPayment = updateResult.rows[0];

    // 8. Credit platform_wallet
    await query(`
      INSERT INTO platform_wallet (payment_id, amount, type, description, balance_after)
      VALUES ($1, $2, 'credit', 'Platform commission from payment', 
        COALESCE((SELECT balance_after FROM platform_wallet ORDER BY created_at DESC LIMIT 1), 0) + $2
      )
    `, [payment.id, platform_commission]);

    // Keep driver_amount in escrow (no action needed, it's just in DB)

    // 9. Auto-assign Engine (Trigger Assignment)
    try {
      const { smartMatchDriver } = require('../../utils/smartMatch');
      const matchResult = await smartMatchDriver(payment.subscription_plan_id);

      // Log to assignment_logs
      await query(`
        INSERT INTO assignment_logs (subscription_id, event_type, ranked_list, created_at)
        VALUES ($1, 'auto_assign', $2, NOW())
      `, [payment.subscription_plan_id, JSON.stringify(matchResult.recommended_drivers || [])]);

      if (matchResult.best_match) {
        const best = matchResult.best_match;
        const { assignDriverToSubscription } = require('../admin/admin.service');
        // Call assignDriverToSubscription which updates status to active, handles seats, and sends notifications
        await assignDriverToSubscription(
          payment.subscription_plan_id, 
          best.driver_profile_id, 
          best.vehicle?.id || null,
          best.estimated_pickup_time,
          best.driver_route_id
        );
      } else {
        // No match found, set to pending_no_driver
        await query(`UPDATE subscription_plans SET status = 'pending_no_driver', updated_at = NOW() WHERE id = $1`, [payment.subscription_plan_id]);
        await query(`UPDATE subscription_requests SET status = 'pending_no_driver', updated_at = NOW() WHERE id = (SELECT request_id FROM subscription_plans WHERE id = $1)`, [payment.subscription_plan_id]);
        
        // Notify admin
        const adminRes = await query(`SELECT id FROM users WHERE role = 'admin'`);
        for (const admin of adminRes.rows) {
          const { createNotification } = require('../../utils/notify');
          createNotification(admin.id, 'Action Required: Unassigned Subscription', `A new subscription ${payment.subscription_plan_id} has been paid but no eligible drivers were found. Please assign manually.`, 'admin_alert');
        }
      }
    } catch (assignmentError) {
      logger.error('Auto-assignment failed during payment success:', assignmentError);
      // Fallback if auto-assignment crashes: activate the plan but leave it pending assignment
      await subscriptionsService.activatePlan(payment.subscription_plan_id, payment.id);
    }

    // 10. Generate invoice HTML and store in payments.invoice_html
    let invoiceHtml = '';
    if (invoiceUtils && typeof invoiceUtils.generateInvoiceHTML === 'function') {
      try {
        // Fetch all required details for invoice
        const detailsResult = await query(`
          SELECT sp.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone,
                 d.user_id as driver_user_id, du.full_name as driver_name,
                 v.brand as vehicle_brand, v.model as vehicle_model, v.vehicle_number
          FROM subscription_plans sp
          JOIN users u ON sp.user_id = u.id
          LEFT JOIN drivers d ON sp.driver_id = d.id
          LEFT JOIN users du ON d.user_id = du.id
          LEFT JOIN vehicles v ON sp.vehicle_id = v.id
          WHERE sp.id = $1
        `, [payment.subscription_plan_id]);
        
        if (detailsResult.rows.length > 0) {
          const det = detailsResult.rows[0];
          invoiceHtml = invoiceUtils.generateInvoiceHTML(updatedPayment, det, 
            { full_name: det.user_name, email: det.user_email, phone: det.user_phone },
            { full_name: det.driver_name },
            { brand: det.vehicle_brand, model: det.vehicle_model, vehicle_number: det.vehicle_number }
          );
          
          await query('UPDATE payments SET invoice_html = $1 WHERE id = $2', [invoiceHtml, payment.id]);
        }
      } catch (e) {
        logger.error('Failed to generate invoice:', e);
      }
    }

    // 11. Send invoice email to user
    const userResult = await query('SELECT email FROM users WHERE id = $1', [payment.user_id]);
    if (userResult.rows.length > 0) {
      console.log(`[EMAIL SIMULATION] To: ${userResult.rows[0].email} | Invoice ${invoice_number} generated`);
    }

    // 12. Emit 'subscription:payment_received' to admin room
    const io = getIo();
    if (io) {
      io.to('admin_room').emit('subscription:payment_received', { payment: updatedPayment });
    }

    // 13. V2: Process wallet payment split (platform 15% / driver 85%)
    try {
      const walletService = require('../../services/walletService');
      if (payment.subscription_plan_id) {
        const planData = await query('SELECT driver_id FROM subscription_plans WHERE id = $1', [payment.subscription_plan_id]);
        const driverId = planData.rows[0]?.driver_id || null;
        if (driverId) {
          await walletService.processSubscriptionPayment({
            subscriptionId: payment.subscription_plan_id,
            userId: payment.user_id,
            driverId: driverId,
            amount: amount,
            razorpayPaymentId: razorpay_payment_id,
          });
        }
      }
    } catch (walletErr) {
      // Don't fail the payment if wallet processing fails
      logger.error('V2 walletService.processSubscriptionPayment error (non-fatal):', walletErr);
    }

    // 14. Return
    return { success: true };
  } catch (error) {
    if (['INVALID_SIGNATURE', 'PAYMENT_NOT_FOUND'].includes(error.message)) throw error;
    logger.error('verifyPaymentAndActivate error:', error);
    throw new Error('DB_ERROR');
  }
};

const getUserPayments = async (userId, options = {}) => {
  try {
    const { status, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    let queryStr = 'SELECT * FROM payments WHERE user_id = $1';
    const queryParams = [userId];
    if (status) {
      queryStr += ' AND status = $2';
      queryParams.push(status);
    }
    queryStr += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await query(queryStr, queryParams);
    
    let countQuery = 'SELECT COUNT(*) FROM payments WHERE user_id = $1';
    const countParams = [userId];
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    const countResult = await query(countQuery, countParams);
    
    return {
      payments: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    };
  } catch (error) {
    logger.error('getUserPayments error:', error);
    throw new Error('DB_ERROR');
  }
};

const getPaymentById = async (id, userId, role) => {
  try {
    const result = await query('SELECT * FROM payments WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new Error('PAYMENT_NOT_FOUND');
    const payment = result.rows[0];
    if (role !== 'admin' && payment.user_id !== userId) throw new Error('NOT_FOUND');
    return payment;
  } catch (error) {
    logger.error('getPaymentById error:', error);
    throw new Error('DB_ERROR');
  }
};

const getInvoiceHTML = async (id, userId, role) => {
  try {
    const result = await query(`
      SELECT p.*, 
             u.full_name as user_name, u.email as user_email, u.phone as user_phone,
             sp.plan_name, sp.plan_type, sp.start_date, sp.end_date
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) throw new Error('PAYMENT_NOT_FOUND');
    const payment = result.rows[0];
    if (role !== 'admin' && payment.user_id !== userId) throw new Error('NOT_FOUND');
    
    const date = new Date(payment.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const invoiceNo = payment.invoice_number || payment.id.substring(0, 8).toUpperCase();
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${invoiceNo}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        .invoice-container {
          position: relative;
          overflow: hidden;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
          border-radius: 16px;
        }

        .invoice-watermark {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
          display: flex;
          flex-wrap: wrap;
          align-content: center;
          justify-content: center;
          opacity: 0.04;
          transform: rotate(-30deg);
          overflow: hidden;
        }

        .invoice-watermark span {
          font-size: 42px;
          font-weight: 800;
          color: #2563EB;
          white-space: nowrap;
          margin: 40px 60px;
          font-family: 'Inter', sans-serif;
          letter-spacing: 2px;
        }

        .invoice-content {
          position: relative;
          z-index: 1;
        }

        .accent-line {
          height: 4px;
          width: 100%;
          background-color: #2563EB;
          position: absolute;
          top: 0;
          left: 0;
        }

        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; padding: 0 !important; }
          .max-w-3xl { max-width: 100% !important; padding: 0 !important; }
          .invoice-container {
            box-shadow: none !important;
            border: none !important;
          }
          .invoice-watermark {
            opacity: 0.05 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body class="bg-gray-100 p-8">
      <div class="max-w-3xl mx-auto bg-white p-10 invoice-container">
        <div class="accent-line"></div>
        <div class="invoice-watermark">
          ${Array.from({ length: 24 }).map(() => '<span>SMART RIDE</span>').join('')}
        </div>

        <div class="invoice-content">
          <!-- Action Buttons -->
          <div class="absolute top-0 right-0 no-print flex gap-3">
            <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download PDF
            </button>
          </div>

          <div class="flex justify-between items-start border-b pb-8 mb-8 pt-4">
            <div>
              <h1 class="text-4xl font-extrabold text-blue-600 tracking-tight">Smart Ride</h1>
              <p class="text-gray-500 mt-1">Hassle-free daily commutes.</p>
            </div>
            <div class="text-right mt-2">
              <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: 1px;">INVOICE</h2>
              <p class="text-gray-500 font-medium mt-1">#INV-${invoiceNo}</p>
              <p class="text-gray-400 text-sm mt-1">Date: ${date}</p>
            </div>
          </div>

        <div class="flex justify-between mb-10">
          <div>
            <h3 class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Billed To:</h3>
            <p class="font-bold text-gray-800 text-lg">${payment.user_name}</p>
            <p class="text-gray-600 mt-1">${payment.user_email || 'No email provided'}</p>
            <p class="text-gray-600">+91 ${payment.user_phone}</p>
          </div>
          <div class="text-right">
            <h3 class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Billed From:</h3>
            <p class="font-bold text-gray-800 text-lg">Smart Ride Technologies</p>
            <p class="text-gray-600 mt-1">Varanasi, UP, India</p>
            <p class="text-gray-600">support@smartride.in</p>
          </div>
        </div>

        <table class="w-full text-left mb-10 border-collapse">
          <thead>
            <tr class="bg-gray-50 border-t border-gray-200" style="border-bottom: 1px solid #e2e8f0;">
              <th class="py-4 px-4 font-semibold text-gray-600 text-sm">Description</th>
              <th class="py-4 px-4 font-semibold text-gray-600 text-sm">Status</th>
              <th class="py-4 px-4 font-semibold text-gray-600 text-sm text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-100">
              <td class="py-5 px-4">
                <p class="font-bold text-gray-800">${payment.plan_name || 'Subscription Payment'}</p>
                <p class="text-sm text-gray-500 mt-1">Via ${payment.payment_method?.replace('_', ' ') || 'Online'}</p>
                ${payment.start_date && payment.end_date ? `<p class="text-xs font-semibold text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-1 rounded">Active: ${new Date(payment.start_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})} - ${new Date(payment.end_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</p>` : ''}
              </td>
              <td class="py-5 px-4">
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${payment.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} uppercase">
                  ${payment.status === 'success' ? '&#10003; ' : ''}${payment.status}
                </span>
              </td>
              <td class="py-5 px-4 text-right font-bold text-gray-800 text-lg">
                ₹${Number(payment.amount).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-end mb-12">
          <div class="w-1/2">
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Subtotal</span>
              <span class="font-semibold text-gray-800">₹${Number(payment.amount - (payment.gst_amount || 0)).toLocaleString('en-IN')}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">GST (Included)</span>
              <span class="font-semibold text-gray-800">₹${Number(payment.gst_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="flex justify-between py-4 border-b-2 border-gray-800 bg-gray-50 px-4 mt-2 rounded" style="border-left: 3px solid #2563EB;">
              <span class="font-bold text-gray-800 text-lg">Total Paid</span>
              <span class="font-bold text-blue-600 text-2xl">₹${Number(payment.amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div class="border-t pt-8 text-center text-gray-500 text-sm">
          <div class="mx-auto w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center font-bold text-xs mb-3">SR</div>
          <p>Thank you for choosing Smart Ride!</p>
          <p class="mt-1">This is a computer generated invoice and does not require a physical signature.</p>
        </div>
      </div>
    </div>
    </body>
    </html>
    `;
  } catch (error) {
    const { logger } = require('../../utils/logger');
    if (logger) logger.error('getInvoiceHTML error:', error);
    throw new Error('DB_ERROR');
  }
};

const initiateRefund = async (id, userId, reason) => {
  return { message: "Refund initiated" };
};

const getPaymentStats = async () => {
  return {};
};

const handleWebhook = async (body, signature) => {
  return {};
};

// ───────────── Manual UPI Payments ─────────────
const createManualPayment = async (userId, subscriptionPlanId, paymentReceiptUrl) => {
  try {
    const planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [subscriptionPlanId]);
    if (planResult.rows.length === 0) throw new Error('SUBSCRIPTION_NOT_FOUND');
    
    const plan = planResult.rows[0];
    if (plan.status !== 'waiting_payment') throw new Error('SUBSCRIPTION_NOT_PENDING');

    const paymentResult = await query(`
      INSERT INTO payments (
        user_id, subscription_plan_id, amount, platform_commission, driver_amount, gst_amount, currency, status, payment_method, payment_receipt_url
      ) VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'pending', 'upi_manual', $7)
      RETURNING *
    `, [
      userId, subscriptionPlanId, plan.total_amount, plan.platform_commission, plan.driver_amount, plan.gst_amount, paymentReceiptUrl
    ]);
    
    return paymentResult.rows[0];
  } catch (error) {
    logger.error('createManualPayment error:', error);
    throw new Error('DB_ERROR');
  }
};

const getPendingManualPayments = async () => {
  try {
    const result = await query(`
      SELECT p.*, 
             u.full_name as user_name, u.phone as user_phone,
             sp.pickup_address, sp.drop_address, sp.plan_type, sp.start_date, sp.preferred_vehicle_type
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
      WHERE p.status = 'pending' AND p.payment_method = 'upi_manual'
      ORDER BY p.created_at DESC
    `);
    return result.rows;
  } catch (error) {
    logger.error('getPendingManualPayments error:', error);
    throw new Error('DB_ERROR');
  }
};

const approveManualPayment = async (paymentId) => {
  try {
    await query('BEGIN');
    
    const paymentResult = await query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    if (paymentResult.rows.length === 0) throw new Error('PAYMENT_NOT_FOUND');
    const payment = paymentResult.rows[0];
    
    if (payment.status !== 'pending') throw new Error('PAYMENT_ALREADY_PROCESSED');
    
    await query("UPDATE payments SET status = 'success' WHERE id = $1", [paymentId]);
    await query("UPDATE subscription_plans SET status = 'active' WHERE id = $1", [payment.subscription_plan_id]);
    
    await query(`
      INSERT INTO platform_wallet (payment_id, amount, type, description, balance_after)
      VALUES ($1, $2, 'credit', $3, (SELECT COALESCE(SUM(case when type = 'credit' then amount else -amount end), 0) + $2 FROM platform_wallet))
    `, [paymentId, payment.platform_commission, 'Commission for subscription ' + payment.subscription_plan_id]);
    
    await query('COMMIT');
    return { success: true, message: 'Payment approved successfully' };
  } catch (error) {
    await query('ROLLBACK');
    logger.error('approveManualPayment error:', error);
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentAndActivate,
  getUserPayments,
  getPaymentById,
  getInvoiceHTML,
  initiateRefund,
  getPaymentStats,
  handleWebhook,
  createManualPayment,
  getPendingManualPayments,
  approveManualPayment
};
