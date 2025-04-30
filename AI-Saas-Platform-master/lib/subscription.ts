import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

const DAY_IN_MS = 86_400_000;

export const checkSubscription = async () => {
  const { userId } = auth();
  console.log("User ID: ", userId);  // Debug: check if userId exists

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
    console.log("User Subscription not found for userId:", userId);  // Debug: check if subscription is found
    return false;
  }

  console.log("User Subscription: ", userSubscription);  // Debug: Check the full subscription data
  
  if (!userSubscription.stripeCurrentPeriodEnd) {
    console.log("stripeCurrentPeriodEnd is missing for userId:", userId);  // Debug: Check if the date is missing
    return false;
  }

  const subscriptionEndTime = new Date(userSubscription.stripeCurrentPeriodEnd).getTime();
  console.log("Subscription End Time (ms):", subscriptionEndTime);  // Debug: log the date in milliseconds

  const currentTime = Date.now();
  console.log("Current Time (ms):", currentTime);  // Debug: log the current time in milliseconds
  
  const isValid = 
    userSubscription.stripePriceId && 
    subscriptionEndTime + DAY_IN_MS > currentTime;

  console.log("Subscription Valid: ", isValid);  // Debug: check if the validity check passes

  return isValid;
};
