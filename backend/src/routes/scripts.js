import { Router } from 'express';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { db } from '../database/connection.js';
import { scripts, scenes, sceneDialogues } from '../database/schema.js';
import { validate, validateParams } from '../validation/middleware.js';
import { uploadScriptSchema, idParamSchema } from '../validation/schemas.js';
import { authMiddleware, roleGuard, asyncHandler, parseScreenplay } from '../utils/index.js';

const router = Router();
router.use(authMiddleware);

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['text/plain', 'application/pdf', 'text/fountain'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.fountain') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .fountain files are supported'));
    }
  },
});

// POST /api/scripts/upload
router.post(
  '/upload',
  roleGuard('director', 'assistant_director'),
  upload.single('script'),
  asyncHandler(async (req, res) => {
    const { projectId, title, version, type } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ success: false, message: 'projectId and title are required' });
    }

    let rawContent = '';
    if (req.file) {
      const fs = await import('fs/promises');
      rawContent = await fs.readFile(req.file.path, 'utf-8');
    } else if (req.body.rawContent) {
      rawContent = req.body.rawContent;
    } else {
      return res.status(400).json({ success: false, message: 'Script file or content is required' });
    }

    const [script] = await db
      .insert(scripts)
      .values({
        projectId,
        title,
        version: version ? parseInt(version) : 1,
        type: type || 'original',
        filePath: req.file?.path || null,
        rawContent,
        status: 'processing',
        uploadedBy: req.user.id,
      })
      .returning();

    // Parse the script
    const { scenes: parsedScenes, errors } = parseScreenplay(rawContent);

    if (errors.length > 0 && parsedScenes.length === 0) {
      await db.update(scripts).set({ status: 'error' }).where(eq(scripts.id, script.id));
      return res.status(422).json({
        success: false,
        message: 'Script parsing failed',
        errors,
      });
    }

    // Insert scenes
    const insertedScenes = [];
    for (const sceneData of parsedScenes) {
      const [insertedScene] = await db
        .insert(scenes)
        .values({
          scriptId: script.id,
          projectId,
          sceneNumber: sceneData.sceneNumber,
          heading: sceneData.heading,
          locationType: sceneData.locationType,
          locationName: sceneData.locationName,
          timeOfDay: sceneData.timeOfDay,
          synopsis: sceneData.synopsis,
          actionLines: sceneData.actionLines,
          characters: sceneData.characters,
          props: sceneData.props,
          costumes: sceneData.costumes,
          specialEffects: sceneData.specialEffects,
          sortOrder: sceneData.sortOrder,
        })
        .returning();

      // Insert dialogues
      if (sceneData.dialogues?.length > 0) {
        for (const dlg of sceneData.dialogues) {
          await db.insert(sceneDialogues).values({
            sceneId: insertedScene.id,
            characterName: dlg.characterName,
            dialogue: dlg.dialogue,
            parenthetical: dlg.parenthetical,
            sortOrder: dlg.sortOrder,
          });
        }
      }

      insertedScenes.push(insertedScene);
    }

    // Update script status
    await db
      .update(scripts)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(scripts.id, script.id));

    res.status(201).json({
      success: true,
      message: `Script uploaded and ${insertedScenes.length} scenes extracted`,
      data: {
        script: { ...script, status: 'processed' },
        scenesCount: insertedScenes.length,
        parsingErrors: errors,
      },
    });
  })
);

// GET /api/scripts/project/:projectId
router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const projectScripts = await db.select().from(scripts).where(eq(scripts.projectId, projectId));
    res.json({ success: true, data: projectScripts });
  })
);

// GET /api/scripts/:id
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const [script] = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);

    if (!script) {
      return res.status(404).json({ success: false, message: 'Script not found' });
    }

    const scriptScenes = await db.select().from(scenes).where(eq(scenes.scriptId, id));

    res.json({ success: true, data: { ...script, scenes: scriptScenes } });
  })
);

// DELETE /api/scripts/:id
router.delete(
  '/:id',
  validateParams(idParamSchema),
  roleGuard('director', 'assistant_director'),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    await db.delete(scripts).where(eq(scripts.id, id));
    res.json({ success: true, message: 'Script deleted' });
  })
);

export default router;
