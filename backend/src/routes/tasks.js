import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { tasks, users } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { createTaskSchema, updateTaskSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';
import { broadcast } from '../websocket.js';

const router = Router();
router.use(authMiddleware);

// POST /api/tasks
router.post(
  '/',
  roleGuard('director', 'assistant_director', 'department_head'),
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [task] = await db.insert(tasks).values(data).returning();

    // Notify assignee
    if (data.assignedTo) {
      broadcast({
        type: 'TASK_ASSIGNED',
        payload: { taskId: task.id, title: task.title, department: task.department },
        targetUserId: data.assignedTo,
      });
    }

    res.status(201).json({ success: true, message: 'Task created', data: task });
  })
);

// GET /api/tasks/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    res.json({ success: true, data: projectTasks });
  })
);

// GET /api/tasks/schedule/:scheduleId
router.get(
  '/schedule/:scheduleId',
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const scheduleTasks = await db.select().from(tasks).where(eq(tasks.scheduleId, scheduleId));
    res.json({ success: true, data: scheduleTasks });
  })
);

// GET /api/tasks/my
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const myTasks = await db.select().from(tasks).where(eq(tasks.assignedTo, req.user.id));
    res.json({ success: true, data: myTasks });
  })
);

// GET /api/tasks/department/:department
router.get(
  '/department/:department',
  asyncHandler(async (req, res) => {
    const { department } = req.params;
    const deptTasks = await db.select().from(tasks).where(eq(tasks.department, department));
    res.json({ success: true, data: deptTasks });
  })
);

// GET /api/tasks/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Get assignee info
    let assignee = null;
    if (task.assignedTo) {
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, task.assignedTo))
        .limit(1);
      assignee = user;
    }

    res.json({ success: true, data: { ...task, assignee } });
  })
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const updateData = { ...data, updatedAt: new Date() };
    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Broadcast task update
    broadcast({
      type: 'TASK_UPDATED',
      payload: { taskId: id, status: updated.status, department: updated.department },
    });

    res.json({ success: true, message: 'Task updated', data: updated });
  })
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    await db.delete(tasks).where(eq(tasks.id, id));
    res.json({ success: true, message: 'Task deleted' });
  })
);

export default router;
