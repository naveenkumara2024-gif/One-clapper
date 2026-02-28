import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { departmentReadiness, scheduleScenes, tasks, schedules, scenes } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { updateReadinessSchema, createReadinessSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, asyncHandler } from '../utils/index.js';
import { broadcast } from '../websocket.js';

const router = Router();
router.use(authMiddleware);

// GET /api/readiness/schedule/:scheduleId
router.get(
  '/schedule/:scheduleId',
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;

    const readiness = await db
      .select()
      .from(departmentReadiness)
      .where(eq(departmentReadiness.scheduleId, scheduleId));

    // Group by scene
    const byScene = {};
    for (const r of readiness) {
      if (!byScene[r.sceneId]) byScene[r.sceneId] = [];
      byScene[r.sceneId].push(r);
    }

    // Calculate overall readiness
    const total = readiness.length;
    const ready = readiness.filter((r) => r.status === 'ready').length;
    const delayed = readiness.filter((r) => r.status === 'delayed' || r.status === 'issue_reported').length;
    const preparing = readiness.filter((r) => r.status === 'preparing').length;

    res.json({
      success: true,
      data: {
        items: readiness,
        byScene,
        summary: {
          total,
          ready,
          preparing,
          delayed,
          notStarted: total - ready - delayed - preparing,
          readinessPercent: total > 0 ? Math.round((ready / total) * 100) : 0,
        },
      },
    });
  })
);

// POST /api/readiness
router.post(
  '/',
  validate(createReadinessSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [entry] = await db.insert(departmentReadiness).values(data).returning();

    res.status(201).json({ success: true, message: 'Readiness entry created', data: entry });
  })
);

// PUT /api/readiness/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateReadinessSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const [updated] = await db
      .update(departmentReadiness)
      .set({
        status: data.status,
        notes: data.notes,
        confirmedBy: req.user.id,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(departmentReadiness.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Readiness entry not found' });
    }

    // Broadcast readiness update
    broadcast({
      type: 'READINESS_UPDATE',
      payload: {
        readinessId: id,
        scheduleId: updated.scheduleId,
        sceneId: updated.sceneId,
        department: updated.department,
        status: updated.status,
      },
    });

    res.json({ success: true, message: 'Readiness updated', data: updated });
  })
);

// GET /api/readiness/dashboard/:scheduleId – Full dashboard data
router.get(
  '/dashboard/:scheduleId',
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;

    // Get schedule
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Get schedule scenes
    const ssRows = await db
      .select()
      .from(scheduleScenes)
      .where(eq(scheduleScenes.scheduleId, scheduleId))
      .orderBy(scheduleScenes.sequenceOrder);

    const scenesData = [];
    for (const ss of ssRows) {
      const [scene] = await db.select().from(scenes).where(eq(scenes.id, ss.sceneId)).limit(1);
      scenesData.push({ ...ss, scene });
    }

    // Get readiness
    const readiness = await db
      .select()
      .from(departmentReadiness)
      .where(eq(departmentReadiness.scheduleId, scheduleId));

    // Get tasks
    const scheduleTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.scheduleId, scheduleId));

    // Build dashboard
    const dashboard = {
      schedule,
      scenes: scenesData.map((ss) => {
        const sceneReadiness = readiness.filter((r) => r.sceneId === ss.sceneId);
        const sceneTasks = scheduleTasks.filter((t) => t.sceneId === ss.sceneId);

        const totalDepts = sceneReadiness.length;
        const readyDepts = sceneReadiness.filter((r) => r.status === 'ready').length;
        const delayedDepts = sceneReadiness.filter((r) => r.status === 'delayed' || r.status === 'issue_reported').length;

        return {
          ...ss,
          readiness: sceneReadiness,
          tasks: sceneTasks,
          readinessPercent: totalDepts > 0 ? Math.round((readyDepts / totalDepts) * 100) : 0,
          hasDelays: delayedDepts > 0,
          status: delayedDepts > 0 ? 'delayed' : readyDepts === totalDepts && totalDepts > 0 ? 'ready' : 'preparing',
        };
      }),
      summary: {
        totalScenes: scenesData.length,
        totalTasks: scheduleTasks.length,
        completedTasks: scheduleTasks.filter((t) => t.status === 'completed').length,
        delayedTasks: scheduleTasks.filter((t) => t.status === 'delayed').length,
        overallReadiness:
          readiness.length > 0
            ? Math.round((readiness.filter((r) => r.status === 'ready').length / readiness.length) * 100)
            : 0,
      },
    };

    res.json({ success: true, data: dashboard });
  })
);

export default router;
