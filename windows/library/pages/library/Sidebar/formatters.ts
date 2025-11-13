// This is too much!

import dayjs from 'dayjs'

export function formatDateOrRelative(date: Date) {
  const now = new Date()
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  )

  const isToday = dayjs().isSame(date, 'day')
  if (isToday) {
    return 'Today'
  }
  const isYesterday = dayjs().subtract(1, 'day').isSame(date, 'day')
  if (isYesterday) {
    return 'Yesterday'
  }

  if (diffInDays <= 7) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
  }

  return formatDate(date)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function buildSearchableDate(date: Date) {
  const parts = [
    // Full month name (e.g., "October")
    new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date),
    // Short month name (e.g., "Oct")
    new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
    // Day of month (e.g., "17")
    date.getDate().toString(),
    // Year (e.g., "2025")
    date.getFullYear().toString(),
    // Day of week (e.g., "Monday")
    new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    // Short day of week (e.g., "Mon")
    new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
  ]

  return parts.join(' ').toLowerCase()
}
