import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listAllUsers,
  adminListExpenses,
  adminReEncryptExpense,
  adminGetPortfolio,
  adminUpdatePortfolioAssets,
  adminUpdatePortfolioValuationHistory,
} from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

    // Verify admin access — this only gates WHO can trigger the migration.
    // The migration itself runs across every user's data via the Admin SDK,
    // not just the calling admin's own records.
    if (!session.user.email || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const users = await listAllUsers();

    let expensesMigrated = 0;
    let expensesSkipped = 0;
    let portfoliosMigrated = 0;
    let portfoliosSkipped = 0;
    const errors: string[] = [];

    for (const user of users) {
      // Expenses: adminListExpenses already decrypts on read (or passes
      // through unchanged if a record was never encrypted). Re-saving every
      // record through adminReEncryptExpense always writes it back encrypted,
      // so this is a safe no-op for already-encrypted records and a real
      // migration for legacy plaintext ones.
      try {
        const expenses = await adminListExpenses(user.uid);
        for (const exp of expenses) {
          try {
            await adminReEncryptExpense(user.uid, exp.id, {
              title: exp.title,
              amount: exp.amount,
              category: exp.category,
              notes: exp.notes,
            });
            expensesMigrated++;
          } catch (err: any) {
            expensesSkipped++;
            errors.push(`expense ${exp.id} (uid ${user.uid}): ${err.message || "Unknown error"}`);
          }
        }
      } catch (err: any) {
        errors.push(`expenses list for uid ${user.uid}: ${err.message || "Unknown error"}`);
      }

      // Portfolio: same re-save-to-force-encrypt approach, applied to the
      // single portfolio document's assets array and valuation history.
      try {
        const portfolio = await adminGetPortfolio(user.uid);
        const valuationHistory = portfolio?.valuationHistory || {};
        if (portfolio && (portfolio.assets.length > 0 || Object.keys(valuationHistory).length > 0)) {
          if (portfolio.assets.length > 0) await adminUpdatePortfolioAssets(user.uid, portfolio.assets);
          if (Object.keys(valuationHistory).length > 0) {
            await adminUpdatePortfolioValuationHistory(user.uid, valuationHistory);
          }
          portfoliosMigrated++;
        }
      } catch (err: any) {
        portfoliosSkipped++;
        errors.push(`portfolio for uid ${user.uid}: ${err.message || "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      expensesMigrated,
      expensesSkipped,
      portfoliosMigrated,
      portfoliosSkipped,
      errors,
    });
  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: error.message || "Migration failed" }, { status: 500 });
  }
}
