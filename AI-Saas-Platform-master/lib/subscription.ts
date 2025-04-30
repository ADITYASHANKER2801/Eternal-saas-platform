import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

const DAY_IN_MS = 86_400_000;

export const checkSubscription = async (): Promise<boolean> => {
  const { userId } = auth();
  console.log("User ID: ", userId); // Debug: check if userId exists

  if (!userId) {
    console.log("No user ID found.");
    return false;
  }

  const userSubscription = await prismadb.userSubscription.findUnique({
    where: {
      userId: userId,
    },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  });

  if (!userSubscription) {
    console.log("User Subscription not found for userId:", userId);
    return false;
  }

  console.log("User Subscription: ", userSubscription);

  if (!userSubscription.stripeCurrentPeriodEnd) {
    console.log("stripeCurrentPeriodEnd is missing for userId:", userId);
    return false;
  }

  const subscriptionEndTime = new Date(userSubscription.stripeCurrentPeriodEnd).getTime();
  const currentTime = Date.now();

  const isValid =
    !!userSubscription.stripePriceId &&
    subscriptionEndTime + DAY_IN_MS > currentTime;

  console.log("Subscription Valid: ", isValid);

  return isValid;
};
