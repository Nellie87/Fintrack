import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { computePositions, type Trade } from "../src/lib/holdings";

/**
 * Demo data for reviewers. All names are fictional.
 * Safe to re-run: it resets only the demo analyst's portfolios.
 *
 *   npx prisma db seed
 */

const DEMO = { name: "Demo Analyst", email: "demo@fintrack.app", password: "Demo@2026" };

type SeedTrade = Omit<Trade, "quantity" | "unitPrice" | "tradeDate"> & {
  quantity: number;
  unitPrice: number;
  tradeDate: string;
};

const b = (instrument: string, quantity: number, unitPrice: number, tradeDate: string): SeedTrade => ({
  instrument, type: "BUY", quantity, unitPrice, tradeDate,
});
const s = (instrument: string, quantity: number, unitPrice: number, tradeDate: string): SeedTrade => ({
  instrument, type: "SELL", quantity, unitPrice, tradeDate,
});

const portfolios: {
  name: string;
  clientName: string;
  baseCurrency: "KES" | "USD";
  trades: SeedTrade[];
}[] = [
  {
    name: "Growth Equity",
    clientName: "Acacia Family Trust",
    baseCurrency: "KES",
    trades: [
      b("SCOM", 10000, 16.2, "2026-08-04"),
      b("EQTY", 2000, 44.5, "2026-08-11"),
      b("KCB", 3000, 38.75, "2026-08-18"),
      b("SCOM", 5000, 17.6, "2026-09-02"),
      s("KCB", 1000, 41.2, "2026-09-23"),
      b("EABL", 400, 152.0, "2026-10-06"),
      s("SCOM", 4000, 18.95, "2026-10-21"),
      b("EQTY", 1000, 47.1, "2026-11-03"),
      b("EABL", 200, 146.5, "2026-11-17"),
    ],
  },
  {
    name: "Income & Treasuries",
    clientName: "Baobab Pension Scheme",
    baseCurrency: "KES",
    trades: [
      b("T-BILL-91", 50000, 97.85, "2026-08-07"),
      b("KCB", 5000, 37.9, "2026-08-14"),
      b("T-BILL-182", 30000, 95.6, "2026-08-28"),
      s("T-BILL-91", 20000, 98.4, "2026-09-25"),
      b("EQTY", 3000, 45.2, "2026-10-01"),
      b("T-BILL-91", 25000, 98.1, "2026-10-16"),
      s("KCB", 2000, 36.4, "2026-11-06"),
    ],
  },
  {
    name: "Global Allocation",
    clientName: "Jacaranda Endowment Fund",
    baseCurrency: "USD",
    trades: [
      b("EUROBOND-2031", 200, 94.25, "2026-08-12"),
      b("VTI", 150, 268.4, "2026-08-20"),
      b("BND", 300, 72.15, "2026-09-09"),
      s("VTI", 50, 281.9, "2026-10-14"),
      b("EUROBOND-2031", 100, 96.1, "2026-10-28"),
      b("BND", 100, 71.6, "2026-11-12"),
    ],
  },
];

async function main() {
  // Fail fast if the demo data itself breaks the holdings rules.
  for (const p of portfolios) computePositions(p.trades);

  const user = await db.user.upsert({
    where: { email: DEMO.email },
    update: { name: DEMO.name, passwordHash: await hashPassword(DEMO.password) },
    create: { name: DEMO.name, email: DEMO.email, passwordHash: await hashPassword(DEMO.password) },
  });

  // Transactions are removed with their portfolios (ON DELETE CASCADE).
  await db.portfolio.deleteMany({ where: { userId: user.id } });

  for (const p of portfolios) {
    await db.portfolio.create({
      data: {
        userId: user.id,
        name: p.name,
        clientName: p.clientName,
        baseCurrency: p.baseCurrency,
        transactions: {
          create: p.trades.map((t) => ({
            instrument: t.instrument,
            type: t.type,
            quantity: String(t.quantity),
            unitPrice: String(t.unitPrice),
            tradeDate: new Date(`${t.tradeDate}T00:00:00Z`),
          })),
        },
      },
    });
  }

  const trades = portfolios.reduce((n, p) => n + p.trades.length, 0);
  console.log(`Seeded ${DEMO.email} / ${DEMO.password} with ${portfolios.length} portfolios and ${trades} trades.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
