import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// The five fictional doctors patients can book. Safe to run more than once:
// existing doctors are updated by name, never duplicated.
const DOCTORS = [
  { name: "Dr. Adaeze Okafor", specialty: "General Practice" },
  { name: "Dr. Babatunde Adeyemi", specialty: "Paediatrics" },
  { name: "Dr. Fatima Bello", specialty: "Obstetrics and Gynaecology" },
  { name: "Dr. Chinedu Eze", specialty: "Internal Medicine" },
  { name: "Dr. Funmilayo Ogunleye", specialty: "Dermatology" },
];

try {
  process.loadEnvFile();
} catch {
  // No .env file: DATABASE_URL must already be set in the environment.
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  for (const doctor of DOCTORS) {
    await prisma.doctor.upsert({
      where: { name: doctor.name },
      update: { specialty: doctor.specialty },
      create: doctor,
    });
  }
  console.log(`Seeded ${DOCTORS.length} doctors.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
