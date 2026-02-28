import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { locations } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { createLocationSchema, updateLocationSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';

const router = Router();
router.use(authMiddleware);

// POST /api/locations
router.post(
  '/',
  roleGuard('director', 'assistant_director'),
  validate(createLocationSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;
    const [location] = await db.insert(locations).values(data).returning();
    res.status(201).json({ success: true, message: 'Location created', data: location });
  })
);

// GET /api/locations/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const locs = await db.select().from(locations).where(eq(locations.projectId, projectId));
    res.json({ success: true, data: locs });
  })
);

// GET /api/locations/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [location] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    res.json({ success: true, data: location });
  })
);

// PUT /api/locations/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  validate(updateLocationSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const [updated] = await db
      .update(locations)
      .set(data)
      .where(eq(locations.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    res.json({ success: true, message: 'Location updated', data: updated });
  })
);

// DELETE /api/locations/:id
router.delete(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    await db.delete(locations).where(eq(locations.id, id));
    res.json({ success: true, message: 'Location deleted' });
  })
);

export default router;
