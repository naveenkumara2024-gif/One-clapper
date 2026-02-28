import { z } from 'zod';

// ── SHARED ─────────────────────────────────────────────────────────
const uuidSchema = z.string().uuid();

const userRoles = ['director', 'assistant_director', 'department_head', 'crew_member', 'temporary_crew'];
const departments = ['direction', 'camera', 'lighting', 'sound', 'art', 'costume', 'makeup', 'production', 'transport', 'catering', 'stunts', 'vfx'];
const timeOfDayValues = ['day', 'night', 'dawn', 'dusk', 'morning', 'afternoon', 'evening'];
const locationTypes = ['interior', 'exterior', 'int_ext'];
const taskStatuses = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'];
const readinessStatuses = ['not_started', 'preparing', 'ready', 'delayed', 'issue_reported'];
const scheduleStatuses = ['draft', 'published', 'revised', 'completed', 'cancelled'];
const notificationTypes = ['schedule_published', 'task_assigned', 'scene_approaching', 'delay_reported', 'readiness_update', 'revision_alert', 'general'];
const notificationChannels = ['app', 'whatsapp', 'both'];

// ── AUTH ────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  phone: z.string().max(20).optional(),
  role: z.enum(userRoles).default('crew_member'),
  department: z.enum(departments).optional(),
  whatsappNumber: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(userRoles).optional(),
  department: z.enum(departments).optional().nullable(),
  whatsappNumber: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().optional(),
});

// ── PROJECT ────────────────────────────────────────────────────────
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(255),
  description: z.string().optional(),
  directorId: uuidSchema.optional(),
  assistantDirectorId: uuidSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  directorId: uuidSchema.optional().nullable(),
  assistantDirectorId: uuidSchema.optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
});

export const addProjectMemberSchema = z.object({
  userId: uuidSchema,
  role: z.enum(userRoles),
  department: z.enum(departments).optional(),
});

// ── SCRIPT ─────────────────────────────────────────────────────────
export const uploadScriptSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(1, 'Script title is required').max(255),
  version: z.number().int().positive().default(1),
  type: z.enum(['original', 'shooting', 'revised']).default('original'),
  rawContent: z.string().optional(),
});

// ── SCENE ──────────────────────────────────────────────────────────
export const createSceneSchema = z.object({
  scriptId: uuidSchema,
  projectId: uuidSchema,
  sceneNumber: z.string().min(1, 'Scene number is required').max(20),
  heading: z.string().min(1, 'Scene heading is required'),
  locationType: z.enum(locationTypes).optional(),
  locationName: z.string().max(255).optional(),
  timeOfDay: z.enum(timeOfDayValues).optional(),
  synopsis: z.string().optional(),
  actionLines: z.string().optional(),
  characters: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
  costumes: z.array(z.string()).default([]),
  specialEffects: z.array(z.string()).default([]),
  estimatedDuration: z.number().int().positive().optional(),
  pageCount: z.string().max(10).optional(),
  sortOrder: z.number().int().default(0),
  notes: z.string().optional(),
});

export const updateSceneSchema = z.object({
  sceneNumber: z.string().max(20).optional(),
  heading: z.string().optional(),
  locationType: z.enum(locationTypes).optional(),
  locationName: z.string().max(255).optional(),
  timeOfDay: z.enum(timeOfDayValues).optional(),
  synopsis: z.string().optional(),
  actionLines: z.string().optional(),
  characters: z.array(z.string()).optional(),
  props: z.array(z.string()).optional(),
  costumes: z.array(z.string()).optional(),
  specialEffects: z.array(z.string()).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  pageCount: z.string().max(10).optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().optional(),
});

// ── LOCATION ───────────────────────────────────────────────────────
export const createLocationSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1, 'Location name is required').max(255),
  address: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  contactPerson: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  notes: z.string().optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  contactPerson: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  notes: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

// ── SCHEDULE ───────────────────────────────────────────────────────
export const createScheduleSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(1, 'Schedule title is required').max(255),
  shootDate: z.string().min(1, 'Shoot date is required'),
  callTime: z.string().optional(),
  wrapTime: z.string().optional(),
  locationId: uuidSchema.optional(),
  notes: z.string().optional(),
});

export const updateScheduleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  shootDate: z.string().optional(),
  callTime: z.string().optional(),
  wrapTime: z.string().optional(),
  locationId: uuidSchema.optional().nullable(),
  status: z.enum(scheduleStatuses).optional(),
  notes: z.string().optional(),
});

export const addSceneToScheduleSchema = z.object({
  sceneId: uuidSchema,
  sequenceOrder: z.number().int().min(0).default(0),
  estimatedStartTime: z.string().optional(),
  estimatedEndTime: z.string().optional(),
  notes: z.string().optional(),
});

export const reviseScheduleSchema = z.object({
  reason: z.string().min(1, 'Revision reason is required'),
  changes: z.record(z.any()),
  scheduleUpdates: updateScheduleSchema.optional(),
});

// ── TASK ───────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  projectId: uuidSchema,
  scheduleId: uuidSchema.optional(),
  sceneId: uuidSchema.optional(),
  department: z.enum(departments),
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().optional(),
  assignedTo: uuidSchema.optional(),
  priority: z.number().int().min(1).max(4).default(1),
  dueTime: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  assignedTo: uuidSchema.optional().nullable(),
  status: z.enum(taskStatuses).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  dueTime: z.string().optional().nullable(),
  notes: z.string().optional(),
});

// ── READINESS ──────────────────────────────────────────────────────
export const updateReadinessSchema = z.object({
  status: z.enum(readinessStatuses),
  notes: z.string().optional(),
});

export const createReadinessSchema = z.object({
  scheduleId: uuidSchema,
  sceneId: uuidSchema,
  department: z.enum(departments),
  status: z.enum(readinessStatuses).default('not_started'),
  notes: z.string().optional(),
});

// ── NOTIFICATION ───────────────────────────────────────────────────
export const createNotificationSchema = z.object({
  projectId: uuidSchema.optional(),
  userId: uuidSchema,
  type: z.enum(notificationTypes),
  channel: z.enum(notificationChannels).default('app'),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  data: z.record(z.any()).optional(),
});

// ── CALL SHEET ─────────────────────────────────────────────────────
export const createCallSheetSchema = z.object({
  scheduleId: uuidSchema,
  projectId: uuidSchema,
  generalCallTime: z.string().optional(),
  crewCalls: z.array(z.object({
    department: z.enum(departments),
    callTime: z.string(),
  })).default([]),
  castCalls: z.array(z.object({
    character: z.string(),
    callTime: z.string(),
    pickupTime: z.string().optional(),
  })).default([]),
  advanceSchedule: z.record(z.any()).optional(),
  specialInstructions: z.string().optional(),
});

// ── DAILY REPORT ───────────────────────────────────────────────────
export const createDailyReportSchema = z.object({
  scheduleId: uuidSchema,
  projectId: uuidSchema,
  scenesCompleted: z.array(z.string()).default([]),
  scenesPartial: z.array(z.string()).default([]),
  delays: z.array(z.object({
    reason: z.string(),
    duration: z.number(),
    department: z.enum(departments).optional(),
  })).default([]),
  departmentNotes: z.record(z.string()).default({}),
  totalShootHours: z.string().max(10).optional(),
  notes: z.string().optional(),
});

// ── PARAM SCHEMAS ──────────────────────────────────────────────────
export const idParamSchema = z.object({
  id: uuidSchema,
});

export const projectIdParamSchema = z.object({
  projectId: uuidSchema,
});
