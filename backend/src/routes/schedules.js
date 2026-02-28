import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../database/connection.js';
import {
  schedules,
  scheduleScenes,
  scenes,
  scheduleRevisions,
  callSheets,
  tasks,
  departmentReadiness,
  notifications,
} from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import {
  createScheduleSchema,
  updateScheduleSchema,
  addSceneToScheduleSchema,
  reviseScheduleSchema,
  createCallSheetSchema,
  idParamSchema,
} from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler, generateDepartmentTasks, generateOneLiner } from '../utils/index.js';
import { broadcast } from '../websocket.js';

const router = Router();
router.use(authMiddleware);

// POST /api/schedules
router.post(
  '/',
  roleGuard('director', 'assistant_director'),
  validate(createScheduleSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [schedule] = await db
      .insert(schedules)
      .values({
        ...data,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ success: true, message: 'Schedule created', data: schedule });
  })
);

// GET /api/schedules/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const projectSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.projectId, projectId))
      .orderBy(schedules.shootDate);
    res.json({ success: true, data: projectSchedules });
  })
);

// GET /api/schedules/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Get schedule scenes with scene data
    const ssRows = await db
      .select()
      .from(scheduleScenes)
      .where(eq(scheduleScenes.scheduleId, id))
      .orderBy(scheduleScenes.sequenceOrder);

    const scenesData = [];
    for (const ss of ssRows) {
      const [scene] = await db.select().from(scenes).where(eq(scenes.id, ss.sceneId)).limit(1);
      scenesData.push({ ...ss, scene });
    }

    // Get readiness data
    const readiness = await db
      .select()
      .from(departmentReadiness)
      .where(eq(departmentReadiness.scheduleId, id));

    // Get schedule tasks
    const scheduleTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.scheduleId, id));

    res.json({
      success: true,
      data: {
        ...schedule,
        scenes: scenesData,
        readiness,
        tasks: scheduleTasks,
        oneLiner: generateOneLiner(scenesData),
      },
    });
  })
);

// PUT /api/schedules/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(updateScheduleSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const updateData = { ...data, updatedAt: new Date() };
    if (data.status === 'published') {
      updateData.publishedAt = new Date();
    }

    const [updated] = await db
      .update(schedules)
      .set(updateData)
      .where(eq(schedules.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // If published, broadcast
    if (data.status === 'published') {
      broadcast({
        type: 'SCHEDULE_PUBLISHED',
        payload: { scheduleId: id, title: updated.title, shootDate: updated.shootDate },
      });
    }

    res.json({ success: true, message: 'Schedule updated', data: updated });
  })
);

// POST /api/schedules/:id/scenes – add scene to schedule
router.post(
  '/:id/scenes',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(addSceneToScheduleSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    // Check schedule exists
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Check scene exists
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, data.sceneId)).limit(1);
    if (!scene) {
      return res.status(404).json({ success: false, message: 'Scene not found' });
    }

    const [ss] = await db
      .insert(scheduleScenes)
      .values({
        scheduleId: id,
        sceneId: data.sceneId,
        sequenceOrder: data.sequenceOrder,
        estimatedStartTime: data.estimatedStartTime,
        estimatedEndTime: data.estimatedEndTime,
        notes: data.notes,
      })
      .returning();

    // Auto-generate department tasks
    const deptTasks = generateDepartmentTasks(scene, id, schedule.projectId);
    for (const task of deptTasks) {
      await db.insert(tasks).values(task);
    }

    // Auto-create readiness entries
    const depts = ['camera', 'lighting', 'sound', 'art', 'costume', 'makeup', 'direction'];
    for (const dept of depts) {
      await db.insert(departmentReadiness).values({
        scheduleId: id,
        sceneId: data.sceneId,
        department: dept,
        status: 'not_started',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Scene added to schedule with auto-generated tasks',
      data: ss,
    });
  })
);

// DELETE /api/schedules/:id/scenes/:sceneId
router.delete(
  '/:id/scenes/:sceneId',
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const { id, sceneId } = req.params;

    await db
      .delete(scheduleScenes)
      .where(and(eq(scheduleScenes.scheduleId, id), eq(scheduleScenes.sceneId, sceneId)));

    res.json({ success: true, message: 'Scene removed from schedule' });
  })
);

// POST /api/schedules/:id/revise
router.post(
  '/:id/revise',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(reviseScheduleSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { reason, changes, scheduleUpdates } = req.validatedBody;

    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const newRevision = schedule.revision + 1;

    // Record revision
    await db.insert(scheduleRevisions).values({
      scheduleId: id,
      revisionNumber: newRevision,
      reason,
      changes,
      revisedBy: req.user.id,
    });

    // Update schedule
    const updateData = {
      ...(scheduleUpdates || {}),
      revision: newRevision,
      status: 'revised',
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(schedules)
      .set(updateData)
      .where(eq(schedules.id, id))
      .returning();

    // Broadcast revision
    broadcast({
      type: 'SCHEDULE_REVISED',
      payload: { scheduleId: id, revision: newRevision, reason },
    });

    res.json({ success: true, message: `Schedule revised (Rev ${newRevision})`, data: updated });
  })
);

// POST /api/schedules/:id/publish
router.post(
  '/:id/publish',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [updated] = await db
      .update(schedules)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    broadcast({
      type: 'SCHEDULE_PUBLISHED',
      payload: { scheduleId: id, title: updated.title, shootDate: updated.shootDate },
    });

    res.json({ success: true, message: 'Schedule published', data: updated });
  })
);

// POST /api/schedules/:id/callsheet
router.post(
  '/:id/callsheet',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(createCallSheetSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [callSheet] = await db.insert(callSheets).values(data).returning();

    res.status(201).json({ success: true, message: 'Call sheet created', data: callSheet });
  })
);

// GET /api/schedules/:id/callsheet
router.get(
  '/:id/callsheet',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const sheets = await db
      .select()
      .from(callSheets)
      .where(eq(callSheets.scheduleId, id));

    res.json({ success: true, data: sheets });
  })
);

export default router;
