import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { projects, projectMembers, users } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { createProjectSchema, updateProjectSchema, addProjectMemberSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// POST /api/projects
router.post(
  '/',
  roleGuard('director', 'assistant_director'),
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [project] = await db
      .insert(projects)
      .values({
        title: data.title,
        description: data.description,
        directorId: data.directorId || (req.user.role === 'director' ? req.user.id : null),
        assistantDirectorId: data.assistantDirectorId || (req.user.role === 'assistant_director' ? req.user.id : null),
        startDate: data.startDate,
        endDate: data.endDate,
      })
      .returning();

    // Add creator as project member
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: req.user.id,
      role: req.user.role,
      department: req.user.department,
    });

    res.status(201).json({ success: true, message: 'Project created', data: project });
  })
);

// GET /api/projects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const memberRows = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, req.user.id));

    const projectIds = memberRows.map((r) => r.projectId);

    if (projectIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const allProjects = [];
    for (const pid of projectIds) {
      const [p] = await db.select().from(projects).where(eq(projects.id, pid));
      if (p) allProjects.push(p);
    }

    res.json({ success: true, data: allProjects });
  })
);

// GET /api/projects/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get members
    const members = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        department: projectMembers.department,
        userName: users.name,
        userEmail: users.email,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id));

    res.json({ success: true, data: { ...project, members } });
  })
);

// PUT /api/projects/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const [updated] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, message: 'Project updated', data: updated });
  })
);

// POST /api/projects/:id/members
router.post(
  '/:id/members',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(addProjectMemberSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    // Check if already a member
    const existing = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, data.userId)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'User is already a project member' });
    }

    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId: id,
        userId: data.userId,
        role: data.role,
        department: data.department,
      })
      .returning();

    res.status(201).json({ success: true, message: 'Member added', data: member });
  })
);

// DELETE /api/projects/:id/members/:userId
router.delete(
  '/:id/members/:userId',
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const { id, userId } = req.params;

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));

    res.json({ success: true, message: 'Member removed' });
  })
);

export default router;
