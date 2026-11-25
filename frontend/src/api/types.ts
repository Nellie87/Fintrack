/** Shapes returned by the FinTrack API (see backend/public/openapi.yaml). */

export type Currency = "KES" | "USD";
export type TransactionType = "BUY" | "SELL";

export type User = { id: number; name: string; email: string };
export type AuthResponse = { token: string; user: User };

export type Portfolio = {
  id: number;
  name: string;
  clientName: string;
  baseCurrency: Currency;
  createdAt: string;
  updatedAt: string;
};
export type PortfolioListItem = Portfolio & { transactionCount: number };
export type PortfolioInput = Pick<Portfolio, "name" | "clientName" | "baseCurrency">;

export type Transaction = {
  id: number;
  portfolioId: number;
  instrument: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  total: number;
  tradeDate: string; // YYYY-MM-DD
  createdAt: string;
};
export type TransactionInput = Pick<Transaction, "instrument" | "type" | "quantity" | "unitPrice" | "tradeDate">;

export type Holding = {
  instrument: string;
  netQuantity: number;
  averageCost: number;
  totalInvested: number;
  marketPrice: number;
  totalValue: number;
  gain: number;
  gainPct: number;
};
export type Totals = { totalInvested: number; totalValue: number; gain: number; gainPct: number };
export type Summary = { portfolioId: number; currency: Currency; holdings: Holding[]; totals: Totals };

export type ErrorDetail = { field: string; message: string };

export type PositionRef = {
  portfolioId: number;
  portfolioName: string;
  currency: Currency;
  instrument: string;
  totalValue: number;
  gain: number;
  gainPct: number;
};

export type Dashboard = {
  portfolioCount: number;
  clientCount: number;
  transactionCount: number;
  byCurrency: (Totals & { currency: Currency; portfolioCount: number })[];
  bestPerformer: PositionRef | null;
  worstPerformer: PositionRef | null;
  topPositions: PositionRef[];
  recentTransactions: {
    id: number;
    portfolioId: number;
    portfolioName: string;
    currency: Currency;
    instrument: string;
    type: TransactionType;
    quantity: number;
    unitPrice: number;
    tradeDate: string;
  }[];
};
