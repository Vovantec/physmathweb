// app/api/referral/route.ts
// GET  /api/referral?userId=...   → get or create referral link
// POST /api/referral              → register referral (called on new user signup)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateReferralCode, REFERRAL_REWARDS } from '@/lib/referral'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

// GET — get (or auto-create) referral link for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
      include: {
        referralLink: {
          include: {
            referrals: {
              include: {
                referred: {
                  select: {
                    firstName: true,
                    username: true,
                    photoUrl: true,
                    points: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Auto-create referral link if missing
    let referralLink = user.referralLink
    if (!referralLink) {
      const code = generateReferralCode(user.firstName, user.id)
      referralLink = await prisma.referralLink.create({
        data: {
          userId: user.id,
          code,
        },
        include: { referrals: true },
      }) as any
    }

    return NextResponse.json({
      code: referralLink!.code,
      referrals: (referralLink as any).referrals ?? [],
      referralPoints: user.referralPoints,
      totalReferred: (referralLink as any).referrals?.length ?? 0,
    })
  } catch (error) {
    console.error('Referral GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST — called when a new user registers via referral link
export async function POST(request: Request) {
  try {
    const { newUserId, referralCode } = await request.json()

    if (!newUserId || !referralCode) {
      return NextResponse.json({ error: 'newUserId and referralCode required' }, { status: 400 })
    }

    const newUser = await prisma.user.findUnique({
      where: { telegramId: BigInt(newUserId) },
    })

    if (!newUser) {
      return NextResponse.json({ error: 'New user not found' }, { status: 404 })
    }

    // Check not already referred
    const existingReferral = await prisma.referral.findUnique({
      where: { referredId: newUser.id },
    })
    if (existingReferral) {
      return NextResponse.json({ alreadyReferred: true })
    }

    // Find referral link
    const referralLink = await prisma.referralLink.findUnique({
      where: { code: referralCode },
    })

    if (!referralLink) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Can't refer yourself
    if (referralLink.userId === newUser.id) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
    }

    // Create referral + award registration bonus
    await prisma.$transaction([
      prisma.referral.create({
        data: {
          referrerId: referralLink.userId,
          referredId: newUser.id,
          linkId: referralLink.id,
        },
      }),
      prisma.user.update({
        where: { id: referralLink.userId },
        data: { referralPoints: { increment: REFERRAL_REWARDS.ON_REGISTER } },
      }),
    ])

    return NextResponse.json({ success: true, referrerId: referralLink.userId })
  } catch (error) {
    console.error('Referral POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}