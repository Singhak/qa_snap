-- AlterTable
ALTER TABLE "TestCaseBatch" ADD COLUMN     "contextNotes" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "sourceMaterials" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredProvider" TEXT;
