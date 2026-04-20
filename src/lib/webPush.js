import webpush from 'web-push';

// Configure VAPID details once (module-level singleton)
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a single subscription object.
 * @param {{ endpoint: string, p256dh: string, auth: string }} subscription
 * @param {{ title: string, body: string, icon?: string, badge?: string, data?: object }} payload
 */
export async function sendWebPush(subscription, payload) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        data: payload.data || {},
      })
    );
    return { success: true };
  } catch (error) {
    // 410 Gone = subscription has expired/been revoked, safe to delete
    if (error.statusCode === 410) {
      return { success: false, expired: true };
    }
    console.error('Push send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications to all subscriptions of a user.
 * Automatically removes expired subscriptions.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {{ title: string, body: string, icon?: string, data?: object }} payload
 */
export async function notifyUser(prisma, userId, payload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const results = await Promise.all(
    subscriptions.map((sub) => sendWebPush(sub, payload))
  );

  // Clean up expired subscriptions
  for (let i = 0; i < results.length; i++) {
    if (results[i].expired) {
      await prisma.pushSubscription.delete({
        where: { id: subscriptions[i].id },
      }).catch(() => {});
    }
  }
}
