import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
  date,
  time,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── ENUMS ──────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', [
  'director',
  'assistant_director',
  'department_head',
  'crew_member',
  'temporary_crew',
]);

export const departmentEnum = pgEnum('department', [
  'direction',
  'camera',
  'lighting',
  'sound',
  'art',
  'costume',
  'makeup',
  'production',
  'transport',
  'catering',
  'stunts',
  'vfx',
]);

export const timeOfDayEnum = pgEnum('time_of_day', [
  'day',
  'night',
  'dawn',
  'dusk',
  'morning',
  'afternoon',
  'evening',
]);

export const locationTypeEnum = pgEnum('location_type', [
  'interior',
  'exterior',
  'int_ext',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'delayed',
  'cancelled',
]);

export const readinessStatusEnum = pgEnum('readiness_status', [
  'not_started',
  'preparing',
  'ready',
  'delayed',
  'issue_reported',
]);

export const scheduleStatusEnum = pgEnum('schedule_status', [
  'draft',
  'published',
  'revised',
  'completed',
  'cancelled',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'schedule_published',
  'task_assigned',
  'scene_approaching',
  'delay_reported',
  'readiness_update',
  'revision_alert',
  'general',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'app',
  'whatsapp',
  'both',
]);

export const scriptStatusEnum = pgEnum('script_status', [
  'uploaded',
  'processing',
  'processed',
  'error',
]);

// ── TABLES ─────────────────────────────────────────────────────────

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('crew_member'),
  department: departmentEnum('department'),
  avatar: text('avatar'),
  isActive: boolean('is_active').notNull().default(true),
  isTemporary: boolean('is_temporary').notNull().default(false),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Projects (Film Productions)
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  directorId: uuid('director_id').references(() => users.id),
  assistantDirectorId: uuid('assistant_director_id').references(() => users.id),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Project Members (many-to-many)
export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull(),
  department: departmentEnum('department'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

// Scripts
export const scripts = pgTable('scripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  version: integer('version').notNull().default(1),
  type: varchar('type', { length: 50 }).notNull().default('original'), // original, shooting, revised
  filePath: text('file_path'),
  rawContent: text('raw_content'),
  status: scriptStatusEnum('status').notNull().default('uploaded'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Scenes (extracted from scripts)
export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  scriptId: uuid('script_id').notNull().references(() => scripts.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sceneNumber: varchar('scene_number', { length: 20 }).notNull(),
  heading: text('heading').notNull(),
  locationType: locationTypeEnum('location_type'),
  locationName: varchar('location_name', { length: 255 }),
  timeOfDay: timeOfDayEnum('time_of_day'),
  synopsis: text('synopsis'),
  actionLines: text('action_lines'),
  characters: jsonb('characters').default([]),       // array of character names
  props: jsonb('props').default([]),                  // array of prop names
  costumes: jsonb('costumes').default([]),            // array of costume notes
  specialEffects: jsonb('special_effects').default([]),
  estimatedDuration: integer('estimated_duration'),    // minutes
  pageCount: varchar('page_count', { length: 10 }),   // e.g., "2 3/8"
  sortOrder: integer('sort_order').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Scene Dialogues
export const sceneDialogues = pgTable('scene_dialogues', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  characterName: varchar('character_name', { length: 255 }).notNull(),
  dialogue: text('dialogue').notNull(),
  parenthetical: text('parenthetical'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// Locations
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  coordinates: jsonb('coordinates'),  // { lat, lng }
  contactPerson: varchar('contact_person', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  notes: text('notes'),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Schedules (Shoot Days)
export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  shootDate: date('shoot_date').notNull(),
  callTime: time('call_time'),
  wrapTime: time('wrap_time'),
  locationId: uuid('location_id').references(() => locations.id),
  status: scheduleStatusEnum('status').notNull().default('draft'),
  revision: integer('revision').notNull().default(0),
  notes: text('notes'),
  weather: jsonb('weather'),           // weather forecast data
  createdBy: uuid('created_by').references(() => users.id),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Schedule Scenes (scenes assigned to a shoot day)
export const scheduleScenes = pgTable('schedule_scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  sequenceOrder: integer('sequence_order').notNull().default(0),
  estimatedStartTime: time('estimated_start_time'),
  estimatedEndTime: time('estimated_end_time'),
  actualStartTime: time('actual_start_time'),
  actualEndTime: time('actual_end_time'),
  status: taskStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
});

// Department Tasks
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scheduleId: uuid('schedule_id').references(() => schedules.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').references(() => scenes.id),
  department: departmentEnum('department').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: integer('priority').notNull().default(1),  // 1=low, 2=medium, 3=high, 4=critical
  dueTime: timestamp('due_time'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Department Readiness (per scene per schedule)
export const departmentReadiness = pgTable('department_readiness', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  department: departmentEnum('department').notNull(),
  status: readinessStatusEnum('status').notNull().default('not_started'),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  confirmedAt: timestamp('confirmed_at'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull().default('app'),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),               // additional payload
  isRead: boolean('is_read').notNull().default(false),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Call Sheets
export const callSheets = pgTable('call_sheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull().default(0),
  generalCallTime: time('general_call_time'),
  crewCalls: jsonb('crew_calls').default([]),        // [{ department, callTime }]
  castCalls: jsonb('cast_calls').default([]),         // [{ character, callTime, pickupTime }]
  advanceSchedule: jsonb('advance_schedule'),         // next day info
  specialInstructions: text('special_instructions'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Schedule Revisions (audit trail)
export const scheduleRevisions = pgTable('schedule_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  revisionNumber: integer('revision_number').notNull(),
  reason: text('reason').notNull(),
  changes: jsonb('changes').notNull(),    // diff data
  revisedBy: uuid('revised_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Daily Reports
export const dailyReports = pgTable('daily_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scenesCompleted: jsonb('scenes_completed').default([]),
  scenesPartial: jsonb('scenes_partial').default([]),
  delays: jsonb('delays').default([]),               // [{ reason, duration, department }]
  departmentNotes: jsonb('department_notes').default({}),
  totalShootHours: varchar('total_shoot_hours', { length: 10 }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── RELATIONS ──────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projectMembers),
  tasks: many(tasks),
  notifications: many(notifications),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  director: one(users, { fields: [projects.directorId], references: [users.id] }),
  assistantDirector: one(users, { fields: [projects.assistantDirectorId], references: [users.id] }),
  members: many(projectMembers),
  scripts: many(scripts),
  scenes: many(scenes),
  schedules: many(schedules),
  locations: many(locations),
  tasks: many(tasks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const scriptsRelations = relations(scripts, ({ one, many }) => ({
  project: one(projects, { fields: [scripts.projectId], references: [projects.id] }),
  uploader: one(users, { fields: [scripts.uploadedBy], references: [users.id] }),
  scenes: many(scenes),
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  script: one(scripts, { fields: [scenes.scriptId], references: [scripts.id] }),
  project: one(projects, { fields: [scenes.projectId], references: [projects.id] }),
  dialogues: many(sceneDialogues),
  scheduledIn: many(scheduleScenes),
  tasks: many(tasks),
  readiness: many(departmentReadiness),
}));

export const sceneDialoguesRelations = relations(sceneDialogues, ({ one }) => ({
  scene: one(scenes, { fields: [sceneDialogues.sceneId], references: [scenes.id] }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  project: one(projects, { fields: [locations.projectId], references: [projects.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  project: one(projects, { fields: [schedules.projectId], references: [projects.id] }),
  location: one(locations, { fields: [schedules.locationId], references: [locations.id] }),
  creator: one(users, { fields: [schedules.createdBy], references: [users.id] }),
  scenes: many(scheduleScenes),
  tasks: many(tasks),
  readiness: many(departmentReadiness),
  callSheets: many(callSheets),
  revisions: many(scheduleRevisions),
  reports: many(dailyReports),
}));

export const scheduleScenesRelations = relations(scheduleScenes, ({ one }) => ({
  schedule: one(schedules, { fields: [scheduleScenes.scheduleId], references: [schedules.id] }),
  scene: one(scenes, { fields: [scheduleScenes.sceneId], references: [scenes.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  schedule: one(schedules, { fields: [tasks.scheduleId], references: [schedules.id] }),
  scene: one(scenes, { fields: [tasks.sceneId], references: [scenes.id] }),
  assignee: one(users, { fields: [tasks.assignedTo], references: [users.id] }),
}));

export const departmentReadinessRelations = relations(departmentReadiness, ({ one }) => ({
  schedule: one(schedules, { fields: [departmentReadiness.scheduleId], references: [schedules.id] }),
  scene: one(scenes, { fields: [departmentReadiness.sceneId], references: [scenes.id] }),
  confirmer: one(users, { fields: [departmentReadiness.confirmedBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  project: one(projects, { fields: [notifications.projectId], references: [projects.id] }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const callSheetsRelations = relations(callSheets, ({ one }) => ({
  schedule: one(schedules, { fields: [callSheets.scheduleId], references: [schedules.id] }),
  project: one(projects, { fields: [callSheets.projectId], references: [projects.id] }),
}));

export const scheduleRevisionsRelations = relations(scheduleRevisions, ({ one }) => ({
  schedule: one(schedules, { fields: [scheduleRevisions.scheduleId], references: [schedules.id] }),
  revisedByUser: one(users, { fields: [scheduleRevisions.revisedBy], references: [users.id] }),
}));

export const dailyReportsRelations = relations(dailyReports, ({ one }) => ({
  schedule: one(schedules, { fields: [dailyReports.scheduleId], references: [schedules.id] }),
  project: one(projects, { fields: [dailyReports.projectId], references: [projects.id] }),
  creator: one(users, { fields: [dailyReports.createdBy], references: [users.id] }),
}));
