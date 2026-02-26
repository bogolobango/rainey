import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";

export async function GET() {
  try {
    const result = await seedDatabase();

    if (result.leadsInserted === 0) {
      return NextResponse.json({
        status: "already_seeded",
        message: "Database already contains data.",
      });
    }

    return NextResponse.json({
      status: "seeded",
      ...result,
    });
  } catch (error) {
    console.error("Failed to seed database:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 },
    );
  }
}
