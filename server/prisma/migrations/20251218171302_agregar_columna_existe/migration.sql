-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "liderDoceId" INTEGER;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
