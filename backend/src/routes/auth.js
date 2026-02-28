import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../database/connection.js';
import { users } from '../database/schema.js';
import { validate } from '../validation/middleware.js';
import { registerSchema, loginSchema, updateUserSchema } from '../validation/schemas.js';
import { generateToken, authMiddleware, roleGuard, asyncHandler } from '../utils/index.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    // Check existing
    const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        role: data.role,
        department: data.department,
        whatsappNumber: data.whatsappNumber,
      })
      .returning();

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
        token,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
        token,
      },
    });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        avatar: users.avatar,
        isActive: users.isActive,
        whatsappNumber: users.whatsappNumber,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  })
);

// PUT /api/auth/me
router.put(
  '/me',
  authMiddleware,
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const data = req.validatedBody;

    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, req.user.id))
      .returning();

    res.json({
      success: true,
      message: 'Profile updated',
      data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, department: updated.department },
    });
  })
);

export default router;
