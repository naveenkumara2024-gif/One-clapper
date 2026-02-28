import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { users, projectMembers } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { updateUserSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';

const router = Router();
router.use(authMiddleware);

// GET /api/crew/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const members = await db
      .select({
        memberId: projectMembers.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: projectMembers.role,
        department: projectMembers.department,
        isTemporary: users.isTemporary,
        whatsappNumber: users.whatsappNumber,
        isActive: users.isActive,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    const permanent = members.filter((m) => !m.isTemporary);
    const temporary = members.filter((m) => m.isTemporary);

    res.json({
      success: true,
      data: { all: members, permanent, temporary, total: members.length },
    });
  })
);

// GET /api/crew/department/:department
router.get(
  '/department/:department',
  asyncHandler(async (req, res) => {
    const { department } = req.params;
    const crewMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        isTemporary: users.isTemporary,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.department, department));

    res.json({ success: true, data: crewMembers });
  })
);

// GET /api/crew/all
router.get(
  '/all',
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const allCrew = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        isTemporary: users.isTemporary,
        isActive: users.isActive,
        whatsappNumber: users.whatsappNumber,
      })
      .from(users);

    res.json({ success: true, data: allCrew });
  })
);

// PUT /api/crew/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Crew member updated',
      data: { id: updated.id, name: updated.name, role: updated.role, department: updated.department },
    });
  })
);

export default router;
