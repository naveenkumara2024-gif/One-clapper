import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { notifications } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { createNotificationSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';
import { broadcast } from '../websocket.js';

const router = Router();
router.use(authMiddleware);

// POST /api/notifications
router.post(
  '/',
  roleGuard('director', 'assistant_director', 'department_head'),
  validate(createNotificationSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [notification] = await db
      .insert(notifications)
      .values({ ...data, sentAt: new Date() })
      .returning();

    // Broadcast via WebSocket
    broadcast({
      type: 'NOTIFICATION',
      payload: notification,
      targetUserId: data.userId,
    });

    res.status(201).json({ success: true, message: 'Notification sent', data: notification });
  })
);

// GET /api/notifications/my
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const myNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = myNotifications.filter((n) => !n.isRead).length;

    res.json({ success: true, data: { notifications: myNotifications, unreadCount } });
  })
);

// PUT /api/notifications/:id/read
router.put(
  '/:id/read',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  })
);

// PUT /api/notifications/read-all
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, req.user.id), eq(notifications.isRead, false)));

    res.json({ success: true, message: 'All notifications marked as read' });
  })
);

export default router;
