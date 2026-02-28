import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { dailyReports, schedules, tasks, scheduleScenes } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { createDailyReportSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';

const router = Router();
router.use(authMiddleware);

// POST /api/reports
router.post(
  '/',
  roleGuard('director', 'assistant_director'),
  validate(createDailyReportSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [report] = await db
      .insert(dailyReports)
      .values({ ...data, createdBy: req.user.id })
      .returning();

    res.status(201).json({ success: true, message: 'Daily report created', data: report });
  })
);

// GET /api/reports/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const reports = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.projectId, projectId));
    res.json({ success: true, data: reports });
  })
);

// GET /api/reports/schedule/:scheduleId
router.get(
  '/schedule/:scheduleId',
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const reports = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.scheduleId, scheduleId));
    res.json({ success: true, data: reports });
  })
);

// GET /api/reports/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  })
);

// GET /api/reports/summary/:projectId – Performance summary
router.get(
  '/summary/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const reports = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.projectId, projectId));

    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    // Aggregate stats
    let totalDelays = 0;
    let totalDelayDuration = 0;
    const departmentDelays = {};

    for (const report of reports) {
      if (report.delays && Array.isArray(report.delays)) {
        for (const delay of report.delays) {
          totalDelays++;
          totalDelayDuration += delay.duration || 0;
          const dept = delay.department || 'unknown';
          departmentDelays[dept] = (departmentDelays[dept] || 0) + 1;
        }
      }
    }

    const tasksByDept = {};
    for (const task of allTasks) {
      if (!tasksByDept[task.department]) {
        tasksByDept[task.department] = { total: 0, completed: 0, delayed: 0 };
      }
      tasksByDept[task.department].total++;
      if (task.status === 'completed') tasksByDept[task.department].completed++;
      if (task.status === 'delayed') tasksByDept[task.department].delayed++;
    }

    res.json({
      success: true,
      data: {
        totalShootDays: reports.length,
        totalDelays,
        totalDelayDuration,
        departmentDelays,
        departmentPerformance: tasksByDept,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter((t) => t.status === 'completed').length,
      },
    });
  })
);

export default router;
