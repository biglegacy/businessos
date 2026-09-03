/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db';
import type { Notification, NotificationPreferences, NotificationLog } from '../types';

// Web Audio API chime synthesizer for real-time notification alerts
export function playNotificationSound(type: 'default' | 'sale' | 'urgent' | 'chime' = 'default'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'sale') {
      // Pleasant double-beep for sales success
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'urgent') {
      // Urgent triple pulse for low stock / kitchen order
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Gentle soft chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // Audio Context blocked or unavailable
  }
}

// Request Web Push Notification Permission
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('Error requesting push notification permission:', err);
    return 'denied';
  }
}

// Trigger native browser push notification popup
export function sendNativePushNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      silent: false,
      ...options
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.warn('Native notification failed:', err);
  }
}

export interface DispatchNotificationOptions {
  businessId: string; // 'global' or business ID
  targetUserId?: string;
  title: string;
  message: string;
  type: 'sales' | 'inventory' | 'kitchen' | 'staff' | 'customer' | 'subscription' | 'system' | 'emergency' | 'maintenance' | 'general' | string;
  actionType?: 'payment' | 'info' | 'order' | 'inventory' | 'url' | string;
  actionUrl?: string;
  senderName?: string;
  scheduledFor?: string;
  soundType?: 'default' | 'sale' | 'urgent' | 'chime';
}

// Core Central Notification Dispatcher
export function dispatchPushNotification(opts: DispatchNotificationOptions): Notification {
  const notifId = 'notif-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
  const now = new Date().toISOString();

  const isScheduled = !!opts.scheduledFor && new Date(opts.scheduledFor) > new Date();

  const newNotif: Notification = {
    notificationId: notifId,
    businessId: opts.businessId,
    targetUserId: opts.targetUserId || 'all',
    title: opts.title,
    message: opts.message,
    type: opts.type,
    createdAt: now,
    status: 'active',
    readStatus: 'unread',
    actionType: opts.actionType || 'info',
    actionUrl: opts.actionUrl,
    senderName: opts.senderName || 'BusinessOS System',
    scheduledFor: opts.scheduledFor,
    deliveryStatus: isScheduled ? 'scheduled' : 'delivered'
  };

  // 1. Save to Database
  db.saveNotification(newNotif);

  // 2. Save Log Entry
  const logEntry: NotificationLog = {
    id: 'log-' + notifId,
    notificationId: notifId,
    sender: opts.senderName || 'System',
    recipient: opts.businessId === 'global' ? 'All Registered Businesses' : `Business ID: ${opts.businessId}`,
    title: opts.title,
    message: opts.message,
    type: opts.type,
    deliveryStatus: isScheduled ? 'scheduled' : 'delivered',
    timestamp: now
  };
  db.saveNotificationLog(logEntry);

  // If scheduled for future, do not trigger immediate web push
  if (isScheduled) {
    return newNotif;
  }

  // 3. Check Notification Preferences
  const currentUser = db.getCurrentUser();
  const prefs: NotificationPreferences = db.getNotificationPreferences(
    opts.businessId,
    currentUser?.id
  );

  // 4. Play audio chime if enabled
  if (prefs.enableSoundAlerts) {
    playNotificationSound(opts.soundType || (opts.type === 'sales' ? 'sale' : opts.type === 'kitchen' ? 'urgent' : 'default'));
  }

  // 5. Native Browser Web Push Notification
  if (prefs.enableWebPush) {
    sendNativePushNotification(opts.title, {
      body: opts.message,
      tag: opts.type
    });
  }

  // 6. Dispatch custom event for real-time UI re-rendering in active tabs
  try {
    const customEvent = new CustomEvent('bos-push-notification', { detail: newNotif });
    window.dispatchEvent(customEvent);
  } catch (e) {
    // browser event error ignore
  }

  return newNotif;
}

// --- SPECIFIC NOTIFICATION TRIGGER HELPERS ---

// 1. SALES & TRANSACTIONS
export function notifyNewSale(businessId: string, sale: { receiptNumber: string; totalAmount: number; itemCount: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'sales',
    title: '🛒 New Sale Completed',
    message: `Receipt #${sale.receiptNumber} processed for ${sale.totalAmount.toFixed(2)} (${sale.itemCount} items).`,
    soundType: 'sale',
    actionType: 'order'
  });
}

export function notifyPaymentConfirmation(businessId: string, payment: { receiptNumber: string; amount: number; method: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'sales',
    title: '💳 Payment Confirmed',
    message: `Payment of ${payment.amount.toFixed(2)} via ${payment.method} confirmed for Receipt #${payment.receiptNumber}.`,
    soundType: 'sale'
  });
}

export function notifyPaymentFailed(businessId: string, details: { amount: number; reason: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'sales',
    title: '⚠️ Payment Attempt Failed',
    message: `Failed payment attempt of ${details.amount.toFixed(2)}. Reason: ${details.reason}`,
    soundType: 'urgent'
  });
}

export function notifyRefundProcessed(businessId: string, refund: { receiptNumber: string; amount: number; customerName?: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'sales',
    title: '🔄 Refund Processed',
    message: `Refund of ${refund.amount.toFixed(2)} issued for Receipt #${refund.receiptNumber}${refund.customerName ? ` (${refund.customerName})` : ''}.`,
    soundType: 'chime'
  });
}

export function notifyLargeTransaction(businessId: string, transaction: { receiptNumber: string; amount: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'sales',
    title: '🌟 High-Value Transaction Alert',
    message: `Significant sale processed: Receipt #${transaction.receiptNumber} total is ${transaction.amount.toFixed(2)}.`,
    soundType: 'sale'
  });
}

export function notifyDailySalesSummary(businessId: string, summary: { totalSales: number; totalRevenue: number; topItem: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'sales',
    title: '📊 Daily Sales Summary',
    message: `Today's total: ${summary.totalSales} sales generating ${summary.totalRevenue.toFixed(2)}. Top seller: ${summary.topItem}.`,
    soundType: 'default'
  });
}

// 2. INVENTORY
export function notifyLowStock(businessId: string, item: { name: string; currentQuantity: number; minThreshold: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'inventory',
    title: '⚠️ Low Stock Warning',
    message: `Item "${item.name}" is running low (${item.currentQuantity} remaining, threshold: ${item.minThreshold}).`,
    soundType: 'urgent',
    actionType: 'inventory'
  });
}

export function notifyOutOfStock(businessId: string, item: { name: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'inventory',
    title: '🚨 Out of Stock Alert',
    message: `Item "${item.name}" is completely OUT OF STOCK! Please reorder immediately.`,
    soundType: 'urgent',
    actionType: 'inventory'
  });
}

export function notifyStockReceived(businessId: string, details: { itemName: string; quantityAdded: number; newTotal: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'inventory',
    title: '📦 New Stock Received',
    message: `Restocked +${details.quantityAdded} units of "${details.itemName}". New balance: ${details.newTotal}.`,
    soundType: 'chime'
  });
}

export function notifyStockAdjustment(businessId: string, details: { itemName: string; newQty: number; reason: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'inventory',
    title: '📝 Stock Level Adjusted',
    message: `"${details.itemName}" inventory adjusted to ${details.newQty}. Reason: ${details.reason}`,
    soundType: 'default'
  });
}

export function notifyStockTransfer(businessId: string, details: { fromBranch: string; toBranch: string; itemCount: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'inventory',
    title: '🚚 Stock Transfer Dispatched',
    message: `Transfer of ${details.itemCount} item(s) initiated from ${details.fromBranch} to ${details.toBranch}.`,
    soundType: 'chime'
  });
}

// 3. FAST FOOD & RESTAURANT KITCHEN
export function notifyNewKitchenOrder(businessId: string, order: { orderNumber: string; tableNumber?: string; type: string; totalItems: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'kitchen',
    title: '🍳 New Kitchen Ticket Received',
    message: `Order #${order.orderNumber} (${order.type}${order.tableNumber ? ` - Table ${order.tableNumber}` : ''}): ${order.totalItems} item(s).`,
    soundType: 'urgent',
    actionType: 'order'
  });
}

export function notifyKitchenOrderStatus(businessId: string, order: { orderNumber: string; status: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'kitchen',
    title: '🔔 Order Status Updated',
    message: `Order #${order.orderNumber} status changed to ${order.status.toUpperCase()}.`,
    soundType: 'chime'
  });
}

export function notifyFoodPrepReminder(businessId: string, order: { orderNumber: string; minutesElapsed: number }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'kitchen',
    title: '⏱️ Food Preparation Reminder',
    message: `Order #${order.orderNumber} has been in preparation for over ${order.minutesElapsed} minutes.`,
    soundType: 'urgent'
  });
}

export function notifyDeliveryUpdate(businessId: string, delivery: { orderNumber: string; customerName: string; status: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'kitchen',
    title: '🛵 Delivery Status Update',
    message: `Delivery for Order #${delivery.orderNumber} (${delivery.customerName}) is now ${delivery.status}.`,
    soundType: 'chime'
  });
}

// 4. STAFF & PERMISSIONS
export function notifyStaffAccountCreated(businessId: string, staff: { name: string; role: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'staff',
    title: '👤 New Staff Account Created',
    message: `Staff member "${staff.name}" added with role "${staff.role.toUpperCase()}".`,
    soundType: 'default'
  });
}

export function notifyPermissionChange(businessId: string, staff: { name: string; newRole: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'staff',
    title: '🔐 Permission Role Updated',
    message: `User permissions for "${staff.name}" updated to "${staff.newRole.toUpperCase()}".`,
    soundType: 'default'
  });
}

// 5. CUSTOMER PROMOTIONS & ANNOUNCEMENTS
export function notifyCustomerPromotion(businessId: string, promo: { title: string; discountDetails: string }): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'customer',
    title: `🎉 ${promo.title}`,
    message: promo.discountDetails,
    soundType: 'chime'
  });
}

// 6. SUBSCRIPTION & SUPER ADMIN
export function notifyTrialExpiration(businessId: string, daysLeft: number): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'subscription',
    title: '⏳ BusinessOS Trial Expiring Soon',
    message: `Your free trial expires in ${daysLeft} day(s). Renew your subscription to maintain full platform features.`,
    soundType: 'urgent',
    actionType: 'payment'
  });
}

export function notifySubscriptionPaymentReminder(businessId: string, daysLeft: number): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'subscription',
    title: '💳 Subscription Payment Reminder',
    message: `Your BusinessOS subscription renewal is due in ${daysLeft} day(s). Click to complete payment.`,
    soundType: 'urgent',
    actionType: 'payment'
  });
}

export function notifySubscriptionPaymentSuccess(businessId: string, amount: number): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'subscription',
    title: '✅ Subscription Renewal Successful',
    message: `Thank you! Payment of GHC ${amount.toFixed(2)} processed. Your subscription is active.`,
    soundType: 'sale'
  });
}

export function notifySubscriptionPaymentFailed(businessId: string, reason: string): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'subscription',
    title: '❌ Subscription Payment Failed',
    message: `Subscription payment failed: ${reason}. Please update your payment method to prevent account suspension.`,
    soundType: 'urgent',
    actionType: 'payment'
  });
}

export function notifyAccountSuspensionWarning(businessId: string, reason: string): Notification {
  return dispatchPushNotification({
    businessId,
    type: 'subscription',
    title: '🚨 Account Suspension Notice',
    message: `Warning: Your workspace account faces suspension due to: ${reason}.`,
    soundType: 'urgent',
    actionType: 'payment'
  });
}

export function notifyAdminGlobalBroadcast(opts: {
  title: string;
  message: string;
  targetBusinessId?: string; // 'global' or business ID
  category?: string;
  senderName?: string;
  scheduledFor?: string;
}): Notification {
  return dispatchPushNotification({
    businessId: opts.targetBusinessId || 'global',
    type: opts.category || 'system',
    title: opts.title,
    message: opts.message,
    senderName: opts.senderName || 'Super Admin',
    scheduledFor: opts.scheduledFor,
    soundType: opts.category === 'emergency' ? 'urgent' : 'chime'
  });
}
