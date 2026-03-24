/**
 * GET /api/retry-failed
 * Vercel Cron: runs every 10 minutes to retry failed orders
 */

import {
  getFailedOrderIds,
  getFailedOrder,
  removeFailedOrder,
  shouldRetry,
  isMaxRetries,
} from '../lib/error-handler.mjs';
import { generateReport } from './generate-report.js';
import { notifyRecovery, notifyManualRequired } from '../lib/telegram.mjs';
import { sendDelayEmail } from '../lib/email-sender.mjs';

export default async function handler(req, res) {
  // Verify Cron auth (Vercel sends Authorization header for cron jobs)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.VERCEL) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const failedIds = await getFailedOrderIds();
    console.log(`[Retry] Found ${failedIds.length} failed orders`);

    let retried = 0;
    let recovered = 0;
    let maxedOut = 0;

    for (const orderId of failedIds) {
      const failedOrder = await getFailedOrder(orderId);
      if (!failedOrder) continue;

      // Check if max retries exceeded
      if (isMaxRetries(failedOrder)) {
        // Send delay email + telegram alert
        const name = failedOrder.orderData?.name || failedOrder.orderData?.person1?.name || 'Customer';
        const email = failedOrder.orderData?.email;

        try { await sendDelayEmail(email, name); } catch (e) { /* ignore */ }
        await notifyManualRequired(name, orderId, email);

        await removeFailedOrder(orderId); // Remove from queue
        maxedOut++;
        continue;
      }

      // Check if enough time has passed
      if (!shouldRetry(failedOrder)) continue;

      // Retry
      retried++;
      console.log(`[Retry] Retrying ${orderId} (attempt ${failedOrder.retryCount + 1})`);

      const result = await generateReport(failedOrder.orderData, orderId);

      if (result.success) {
        await removeFailedOrder(orderId);
        const name = failedOrder.orderData?.name || failedOrder.orderData?.person1?.name || 'Customer';
        await notifyRecovery(name, orderId);
        recovered++;
      }
    }

    return res.status(200).json({
      ok: true,
      total: failedIds.length,
      retried,
      recovered,
      maxedOut,
    });
  } catch (err) {
    console.error('[Retry] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
