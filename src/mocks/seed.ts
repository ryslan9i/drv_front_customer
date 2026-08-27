import { roundedLessonCount } from '@/lib/derive'
import type { AccountSettings, School, SchoolClass, Session, Subject, Teacher, User, WorkloadEntry } from '@/types/domain'

const FIRST_NAMES = [
  'Олександр', 'Марія', 'Іван', 'Ольга', 'Петро', 'Наталія', 'Микола', 'Тетяна', 'Андрій', 'Оксана',
  'Дмитро', 'Ірина', 'Сергій', 'Світлана', 'Юрій', 'Вікторія', 'Богдан', 'Катерина', 'Володимир', 'Людмила',
  'Максим', 'Анна', 'Роман', 'Юлія', 'Артем', 'Галина', 'Олег', 'Марина', 'Тарас', 'Софія',
  'Віталій', 'Христина', 'Євген', 'Аліна', 'Костянтин', 'Дарина', 'Павло', 'Валентина', 'Руслан', 'Яна',
  'Григорій', 'Лариса',
]

const LAST_NAMES = [
  'Коваленко', 'Бондаренко', 'Шевченко', 'Ткаченко', 'Кравченко', 'Олійник', 'Шевчук', 'Поліщук', 'Бойко', 'Мороз',
  'Мельник', 'Кузьменко', 'Романюк', 'Савченко', 'Клименко', 'Пономаренко', 'Гончаренко', 'Марченко', 'Іванов', 'Козак',
  'Гнатюк', 'Литвин', 'Демченко', 'Захарченко', 'Руденко', 'Пасічник', 'Сидоренко', 'Гриценко', 'Малиновський', 'Дяченко',
  'Василенко', 'Кучер', 'Панченко', 'Тищенко', 'Юрченко', 'Приходько', 'Нестеренко', 'Лисенко', 'Мазур', 'Гаврилюк',
  'Столяр', 'Швець',
]

const SUBJECT_NAMES = [
  'Математика', 'Англійська мова', 'Зарубіжна література', 'Фізика', 'Хімія', 'Біологія', 'Історія', 'Географія',
  'Інформатика', 'Образотворче мистецтво', 'Музичне мистецтво', 'Фізична культура', 'Економіка', 'Основи бізнесу',
  'Французька мова', 'Іспанська мова', 'Основи християнської етики', 'Трудове навчання', 'Драматургія', 'Філософія',
  'Екологія', 'Громадянська освіта', "Основи здоров'я", 'Робототехніка', 'Статистика',
]

const now = new Date('2024-08-12T09:00:00.000Z').toISOString()

export const school: School = {
  id: 'school-1',
  name: 'Школа майбутнього',
  workingDays: 5,
  periodsPerDay: 9,
  createdAt: now,
}

export const subjects: Subject[] = SUBJECT_NAMES.map((name, i) => ({
  id: `subject-${i}`,
  schoolId: school.id,
  name,
  createdAt: now,
}))

export const classes: SchoolClass[] = []
for (let grade = 1; grade <= 9; grade++) {
  for (const section of ['А', 'Б']) {
    classes.push({
      id: `class-${classes.length}`,
      schoolId: school.id,
      name: `${grade}-${section}`,
      grade,
      studentsCount: 22 + ((grade + section.charCodeAt(0)) % 10),
      createdAt: now,
    })
  }
}

const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y',
  і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
  ю: 'iu', я: 'ia',
}

export function transliterate(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join('')
}

export const teachers: Teacher[] = []
const TEACHER_NAMES: [string, string][] = [['Іван', 'Коваленко'], ['Олена', 'Мельник']]
for (let i = 2; i < 42; i++) TEACHER_NAMES.push([FIRST_NAMES[i], LAST_NAMES[i]])

TEACHER_NAMES.forEach(([firstName, lastName], index) => {
  teachers.push({
    id: `teacher-${index}`,
    schoolId: school.id,
    firstName,
    lastName,
    maxLessonsPerDay: 5 + (index % 3),
    maxLessonsPerWeek: 20, // recomputed below once actual assigned load is known
    createdAt: now,
  })
})

function subjectTeacherPool(subjectIndex: number): number[] {
  const isCore = subjectIndex <= 7
  const count = isCore ? 4 : 2
  const base = (subjectIndex * 5) % 42
  const pool = Array.from({ length: count }, (_, k) => (base + k) % 42)
  if (subjectIndex === 0 && !pool.includes(0)) pool.unshift(0) // Математика -> Іван Коваленко
  if (subjectIndex === 3 && !pool.includes(0)) pool.unshift(0) // Фізика -> Іван Коваленко
  if (subjectIndex === 5 && !pool.includes(1)) pool.unshift(1) // Біологія -> Олена Мельник
  return pool
}

// Кілька дробових значень (1.5, 0.5) навмисно — щоб розклад демонстрував двотижневу
// ротацію: такі предмети потрапляють лише в один тиждень або чергуються між тижнями.
const NORMAL_PATTERN = [5, 5, 4, 4, 3, 3, 2, 2, 1.5, 1.5, 1, 0.5, 0.5] // середнє за 2 тижні, сума 35 < 45

export const workload: WorkloadEntry[] = []

classes.forEach((cls, classIndex) => {
  const rotationStart = (classIndex * 5) % 23
  const curriculumIndices = [0, 1, ...Array.from({ length: 11 }, (_, k) => 2 + ((rotationStart + k) % 23))]

  curriculumIndices.forEach((subjectIndex, slot) => {
    const pool = subjectTeacherPool(subjectIndex)
    const teacherIndex = pool[(classIndex + slot) % pool.length]
    workload.push({
      id: `workload-${workload.length}`,
      schoolId: school.id,
      classId: cls.id,
      subjectId: subjects[subjectIndex].id,
      teacherId: teachers[teacherIndex].id,
      lessonsPerWeek: NORMAL_PATTERN[slot],
      createdAt: now,
    })
  })
})

// Give every teacher headroom above their actual assigned load so the seeded
// school generates cleanly; the demo can still exercise the "Impossible"
// generation path by editing a teacher's weekly limit down from Teachers.
for (const teacher of teachers) {
  const load = workload
    .filter((w) => w.teacherId === teacher.id)
    .reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
  teacher.maxLessonsPerWeek = Math.max(load + 2, 20)
}

export const demoUser: User = {
  id: 'user-1',
  username: 'admin',
  firstName: 'Олег',
  lastName: 'Мороз',
  email: 'admin@example-school.edu',
  phone: '+380 67 019 2245',
  role: 'school_admin',
  schoolId: school.id,
  schoolName: school.name,
  organization: 'Департамент освіти',
  status: 'active',
  createdAt: '2024-08-12T09:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  twoFactorEnabled: true,
}

export const sessions: Session[] = [
  {
    id: 'session-1',
    browser: 'Chrome',
    os: 'Linux',
    location: 'Київ, Україна',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: 'session-2',
    browser: 'Firefox',
    os: 'Windows',
    location: 'Київ, Україна',
    lastActiveAt: new Date(Date.now() - 86_400_000).toISOString(),
    isCurrent: false,
  },
]

export const accountSettings: AccountSettings = {
  language: 'uk',
  timeZone: 'Europe/Kyiv',
  theme: 'system',
  notifications: {
    email: true,
    scheduleGenerated: true,
    conflicts: true,
    productUpdates: false,
  },
}
