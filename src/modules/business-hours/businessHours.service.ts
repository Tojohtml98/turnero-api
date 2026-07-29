import businessHoursRepo from './businessHours.repository'
import { WeekSchedule } from './businessHours.model'

const get = () => businessHoursRepo.getOrCreate()

const update = (data: { hours?: Partial<WeekSchedule>; slotStepMinutes?: number }) =>
  businessHoursRepo.update(data)

export default { get, update }
