import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

const sqlite = new Database('./data/whatidid.db')
sqlite.pragma('journal_mode = WAL')
const db = drizzle(sqlite, { schema })

// Apply migrations first
migrate(db, { migrationsFolder: './drizzle' })

// Clear existing data
db.delete(schema.taskTags).run()
db.delete(schema.listItems).run()
db.delete(schema.tasks).run()
db.delete(schema.lists).run()
db.delete(schema.tags).run()
db.delete(schema.priorityCategories).run()

// Seed priority categories
db.insert(schema.priorityCategories)
  .values([
    {
      id: 'cat_001',
      name: 'Business-Critical',
      description:
        'Work that directly drives company/team OKRs and outcomes',
      color: '#ef4444',
      sortOrder: 0,
      userId: '1',
    },
    {
      id: 'cat_002',
      name: 'Momentum Builders',
      description:
        'Unblocks or supports critical work & progress',
      color: '#f97316',
      sortOrder: 1,
      userId: '1',
    },
    {
      id: 'cat_003',
      name: 'Nice-to-Haves',
      description:
        'Good ideas, but not tied to impact or timing',
      color: '#3b82f6',
      sortOrder: 2,
      userId: '1',
    },
    {
      id: 'cat_004',
      name: 'Noise',
      description: 'Low-leverage work that clutters your focus',
      color: '#6b7280',
      sortOrder: 3,
      userId: '1',
    },
  ])
  .run()

// Seed default lists
db.insert(schema.lists)
  .values([
    { id: 'inbox', title: 'Inbox', userId: '1' },
    { id: 'upcoming', title: 'Upcoming', userId: '1' },
    { id: 'completed', title: 'Completed', userId: '1' },
  ])
  .run()

// Seed sample tasks
const sampleTasks = [
  {
    id: 'tsk_001',
    title: 'Plan Q4 roadmap',
    notes: 'Outline key deliverables and milestones.',
    dateCreated: '2025-09-25T09:12:03.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 0,
  },
  {
    id: 'tsk_002',
    title: 'Refactor legacy auth module',
    notes: 'Improve readability and add missing tests.',
    dateCreated: '2025-09-20T14:31:10.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 1,
  },
  {
    id: 'tsk_003',
    title: 'Write unit tests for task utils',
    notes: 'Focus on edge cases around completion toggling.',
    dateCreated: '2025-09-29T11:05:47.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 2,
  },
  {
    id: 'tsk_004',
    title: 'Update README deployment section',
    notes: 'Add staging environment notes.',
    dateCreated: '2025-09-18T08:44:55.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 3,
  },
  {
    id: 'tsk_005',
    title: 'Design notification settings UI',
    notes: 'Keep components accessible with proper ARIA.',
    dateCreated: '2025-10-01T10:02:11.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 4,
  },
  {
    id: 'tsk_006',
    title: 'Fix timezone bug in date picker',
    notes: 'Occurs when user switches locale mid-session.',
    dateCreated: '2025-09-30T07:22:39.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 5,
  },
  {
    id: 'tsk_007',
    title: 'Add API error handling tests',
    notes: 'Cover error states (500, 404).',
    dateCreated: '2025-09-27T15:50:33.000Z',
    dateCompleted: '2025-11-17T17:46:50.189Z',
    userId: '1',
    sortOrder: 6,
  },
  {
    id: 'tsk_008',
    title: 'Optimize bundle size',
    notes: 'Investigate code splitting for feature routes.',
    dateCreated: '2025-09-23T09:05:14.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 7,
  },
  {
    id: 'tsk_009',
    title: 'Create productivity tips blog draft',
    notes: 'Reference reputable sources.',
    dateCreated: '2025-09-26T12:14:57.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 8,
  },
  {
    id: 'tsk_010',
    title: 'Build task filtering system',
    notes: 'Use client-side filtering first pass.',
    dateCreated: '2025-10-03T13:43:22.000Z',
    dateCompleted: null,
    userId: '1',
    sortOrder: 9,
  },
]

db.insert(schema.tasks).values(sampleTasks).run()

// Seed list items (tasks in inbox)
const listItemValues = sampleTasks.map((task, index) => ({
  id: `li_${String(index + 1).padStart(3, '0')}`,
  listId: 'inbox',
  taskId: task.id,
  sortOrder: index,
}))

db.insert(schema.listItems).values(listItemValues).run()

console.info('Database seeded successfully.')
console.info(`  - ${4} priority categories`)
console.info(`  - ${3} lists`)
console.info(`  - ${sampleTasks.length} tasks`)
console.info(`  - ${listItemValues.length} list items`)

sqlite.close()
