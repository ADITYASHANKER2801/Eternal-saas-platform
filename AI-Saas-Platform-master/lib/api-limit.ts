import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { MAX_FREE_COUNTS } from "@/constants";

/**
 * Increments the API usage count for the authenticated user.
 */
export const incrementApiLimit = async () => {
  try {
    const { userId } = auth();
    if (!userId) return;

    await prismadb.userApiLimit.upsert({
      where: { userId },
      update: { count: { increment: 1 } },
      create: { userId, count: 1 },
    });
  } catch (error) {
    console.error("❌ Error incrementing API limit:", error);
  }
};

/**
 * Checks if the authenticated user is within the allowed free API limit.
 * @returns {Promise<boolean>} True if within limit, otherwise false.
 */
export const checkApiLimit = async (): Promise<boolean> => {
  try {
    const { userId } = auth();
    if (!userId) return false;

    const userApiLimit = await prismadb.userApiLimit.findUnique({
      where: { userId },
      select: { count: true },
    });

    return !userApiLimit || userApiLimit.count < MAX_FREE_COUNTS;
  } catch (error) {
    console.error("❌ Error checking API limit:", error);
    return false;
  }
};

/**
 * Retrieves the current API usage count for the authenticated user.
 * @returns {Promise<number>} The current API count.
 */
export const getApiLimitCount = async (): Promise<number> => {
  try {
    const { userId } = auth();
    if (!userId) return 0;

    const userApiLimit = await prismadb.userApiLimit.findUnique({
      where: { userId },
      select: { count: true },
    });

    return userApiLimit?.count ?? 0;
  } catch (error) {
    console.error("❌ Error retrieving API limit count:", error);
    return 0;
  }
};
