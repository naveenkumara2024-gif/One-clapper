import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { scenes, sceneDialogues } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { createSceneSchema, updateSceneSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, asyncHandler } from '../utils/index.js';

const router = Router();
router.use(authMiddleware);

// GET /api/scenes/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(scenes.sortOrder);
    res.json({ success: true, data: projectScenes });
  })
);

// GET /api/scenes/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, id)).limit(1);

    if (!scene) {
      return res.status(404).json({ success: false, message: 'Scene not found' });
    }

    const dialogues = await db
      .select()
      .from(sceneDialogues)
      .where(eq(sceneDialogues.sceneId, id))
      .orderBy(sceneDialogues.sortOrder);

    res.json({ success: true, data: { ...scene, dialogues } });
  })
);

// POST /api/scenes (manual creation)
router.post(
  '/',
  validate(createSceneSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [scene] = await db.insert(scenes).values(data).returning();

    res.status(201).json({ success: true, message: 'Scene created', data: scene });
  })
);

// PUT /api/scenes/:id
router.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateSceneSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = req.validatedBody;

    const [updated] = await db
      .update(scenes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scenes.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Scene not found' });
    }

    res.json({ success: true, message: 'Scene updated', data: updated });
  })
);

// DELETE /api/scenes/:id
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    await db.delete(scenes).where(eq(scenes.id, id));
    res.json({ success: true, message: 'Scene deleted' });
  })
);

export default router;
