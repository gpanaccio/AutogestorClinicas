const { PrismaClient } = require("@prisma/client");
const palabras = require("./palabras-prohibidas.json");

const prisma = new PrismaClient();

async function main() {
  for (const palabra of palabras) {
    await prisma.palabraProhibida.upsert({
      where: { palabra },
      create: { palabra },
      update: {},
    });
  }
  console.log(`Palabras prohibidas: ${palabras.length} listas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
