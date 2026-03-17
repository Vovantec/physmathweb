// lib/telegram-notify.ts
// Путь: lib/telegram-notify.ts

import { prisma } from '@/lib/prisma'

const BOT_TOKEN = process.env.BOT_TOKEN!
const TG_API    = `https://api.telegram.org/bot${BOT_TOKEN}`

export type NotificationType =
  | 'deadlineReminder'
  | 'newLesson'
  | 'newNews'
  | 'ratingChange'
  | 'prizeAwarded'

interface SendOptions {
  userId: number          // User.id (not telegramId)
  type:   NotificationType
  text:   string
  refId?: string          // dedup key: lessonId, newsId, poolId, etc.
}

/**
 * Send a Telegram message to a user if:
 *  1. The notification type is enabled in their settings
 *  2. We haven't already sent this exact (type + refId) recently
 */
export async function sendTelegramNotification(opts: SendOptions): Promise<boolean> {
  const { userId, type, text, refId } = opts

  try {
    // 1. Load user + settings in one query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        notificationSettings: true,
      },
    })

    if (!user) return false

    // 2. Check user preference (default = enabled if no row yet)
    const settings = user.notificationSettings
    if (settings && settings[type] === false) return false

    // 3. Dedup check — avoid sending the same notification twice
    if (refId) {
      const already = await prisma.notificationLog.findFirst({
        where: { userId, type, refId },
      })
      if (already) return false
    }

    // 4. Send via Telegram Bot API (Variant A — direct HTTP)
    const res = await fetch(`${TG_API}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    user.telegramId.toString(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[TG notify] failed for user ${userId}:`, err)
      return false
    }

    // 5. Log so we don't resend
    await prisma.notificationLog.create({
      data: { userId, type, refId: refId ?? null },
    })

    return true
  } catch (e) {
    console.error('[TG notify] error:', e)
    return false
  }
}

/**
 * Bulk send to many users — fire-and-forget, no await on each
 */
export async function broadcastNotification(
  userIds: number[],
  type:    NotificationType,
  getText: (userId: number) => string,
  refId?:  string
) {
  await Promise.allSettled(
    userIds.map(id =>
      sendTelegramNotification({ userId: id, type, text: getText(id), refId })
    )
  )
}

/**
 * Get or create notification settings for a user (all enabled by default)
 */
export async function getOrCreateNotificationSettings(userId: number) {
  return prisma.notificationSettings.upsert({
    where:  { userId },
    update: {},
    create: { userId },
  })
}