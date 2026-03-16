import { checkInternalAuth, jsonResponse } from "@/lib/internal-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!checkInternalAuth(request)) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const bases = await prisma.base.findMany({
      include: {
        user: {
          select: { telegramId: true, firstName: true, username: true }
        }
      }
    });

    const result = bases.map(b => ({
      userId: b.user.telegramId.toString(),
      username: b.user.firstName || b.user.username || "???",
      mapX: b.mapX,
      mapY: b.mapY,
    }));

    return jsonResponse({ bases: result });
  } catch (e) {
    return jsonResponse({ error: "Server error" }, 500);
  }
}
