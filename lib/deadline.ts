// lib/deadline.ts
// Centralized deadline logic — used by API routes and frontend

export type DeadlinePolicy = 'block' | 'penalty' | 'mark'

export interface DeadlineStatus {
  hasDeadline: boolean
  deadline: Date | null
  isLate: boolean
  isBlocked: boolean
  hoursLeft: number | null   // negative = overdue
  daysLeft: number | null
  penaltyMultiplier: number  // 1.0 = no penalty
}

/**
 * Calculate personal deadline for a lesson.
 * enrolledAt + offsetDays = personalDeadline
 */
export function calcDeadline(
  enrolledAt: Date | null | undefined,
  deadlineOffsetDays: number | null | undefined
): Date | null {
  if (!enrolledAt || deadlineOffsetDays == null) return null
  const d = new Date(enrolledAt)
  d.setDate(d.getDate() + deadlineOffsetDays)
  return d
}

/**
 * Full deadline status for a student on a specific lesson.
 */
export function getDeadlineStatus(
  enrolledAt: Date | null | undefined,
  deadlineOffsetDays: number | null | undefined,
  policy: DeadlinePolicy,
  penaltyMultiplier: number
): DeadlineStatus {
  const deadline = calcDeadline(enrolledAt, deadlineOffsetDays)

  if (!deadline) {
    return {
      hasDeadline: false,
      deadline: null,
      isLate: false,
      isBlocked: false,
      hoursLeft: null,
      daysLeft: null,
      penaltyMultiplier: 1.0,
    }
  }

  const now = new Date()
  const msLeft = deadline.getTime() - now.getTime()
  const hoursLeft = msLeft / (1000 * 60 * 60)
  const daysLeft = msLeft / (1000 * 60 * 60 * 24)
  const isLate = msLeft < 0

  return {
    hasDeadline: true,
    deadline,
    isLate,
    isBlocked: isLate && policy === 'block',
    hoursLeft,
    daysLeft,
    penaltyMultiplier: isLate && policy === 'penalty' ? penaltyMultiplier : 1.0,
  }
}

/**
 * Format deadline for display.
 */
export function formatDeadline(deadline: Date): string {
  return deadline.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format time remaining for countdown display.
 */
export function formatTimeLeft(hoursLeft: number): string {
  if (hoursLeft < 0) {
    const h = Math.abs(hoursLeft)
    if (h < 24) return `просрочено на ${Math.floor(h)}ч`
    return `просрочено на ${Math.floor(h / 24)}д`
  }
  if (hoursLeft < 1) return `${Math.floor(hoursLeft * 60)} мин`
  if (hoursLeft < 24) return `${Math.floor(hoursLeft)}ч ${Math.floor((hoursLeft % 1) * 60)}мин`
  const d = Math.floor(hoursLeft / 24)
  const h = Math.floor(hoursLeft % 24)
  return h > 0 ? `${d}д ${h}ч` : `${d}д`
}