import prismadb from "@/lib/prismadb";

const createUserSubscription = async () => {
  try {
    const newSubscription = await prismadb.userSubscription.create({
      data: {
        userId: "test_user_123",
        stripeSubscriptionId: "sub_12345",
        stripeCustomerId: "cus_12345",
        stripePriceId: "price_12345",
        stripeCurrentPeriodEnd: new Date(),
      },
    });
    console.log("✅ Created subscription:", newSubscription);
  } catch (error) {
    console.error("❌ Error creating subscription:", error);
  } finally {
    await prismadb.$disconnect(); // disconnect from db
  }
};

createUserSubscription();
