'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Reads ?ref=CODE from URL, stores it in sessionStorage.
 * After the user authenticates (userId saved to localStorage),
 * sends the referral registration request.
 *
 * Include this component in the root layout or courses page.
 */
export default function ReferralHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // 1. Capture referral code from URL
    const refCode = searchParams.get('ref')
    if (refCode) {
      sessionStorage.setItem('pending_referral', refCode)
    }

    // 2. Try to register if user is already logged in
    registerPendingReferral()
  }, [])

  return null
}

export async function registerPendingReferral() {
  const pendingCode = sessionStorage.getItem('pending_referral')
  if (!pendingCode) return

  const userId = localStorage.getItem('user_id')
  if (!userId) return  // not logged in yet — will retry on next load

  // Already processed this session
  if (sessionStorage.getItem('referral_registered')) return

  try {
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newUserId: userId,
        referralCode: pendingCode,
      }),
    })

    if (res.ok) {
      sessionStorage.setItem('referral_registered', '1')
      sessionStorage.removeItem('pending_referral')
    }
  } catch {
    // Silent fail — will retry on next page load
  }
}