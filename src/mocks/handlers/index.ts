import { accountHandlers } from './account'
import { classHandlers, subjectHandlers, teacherHandlers, workloadHandlers } from './academic'
import { authHandlers } from './auth'
import { availabilityHandlers } from './availability'
import { constraintHandlers } from './constraints'
import { scheduleHandlers } from './schedule'
import { schoolHandlers } from './school'

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...schoolHandlers,
  ...teacherHandlers,
  ...classHandlers,
  ...subjectHandlers,
  ...workloadHandlers,
  ...availabilityHandlers,
  ...constraintHandlers,
  ...scheduleHandlers,
]
