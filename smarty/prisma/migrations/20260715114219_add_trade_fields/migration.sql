-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "moneyDifference" DOUBLE PRECISION,
ADD COLUMN     "tradeDescription" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MONEY';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "acceptMoneyDifference" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tradeInterests" TEXT;
