const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { scryptSync, randomBytes } = require('crypto');
require('dotenv').config();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const phone = '8100264108';
  const plainPassword = 'destiny@2035';
  const hashedPassword = hashPassword(plainPassword);

  console.log('Ensuring admin user with phone:', phone);

  const existing = await prisma.user.findFirst({
    where: { phone },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'ADMIN',
        password: hashedPassword,
        name: existing.name || 'UK MART Admin',
        isActive: true,
      },
    });
    console.log('Admin user updated:', updated.id, updated.name, updated.phone, updated.role);
  } else {
    const created = await prisma.user.create({
      data: {
        name: 'UK MART Admin',
        phone,
        password: hashedPassword,
        role: 'ADMIN',
        email: 'martuk877@gmail.com',
        isActive: true,
      },
    });
    console.log('Admin user created:', created.id, created.name, created.phone, created.role);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Error seeding admin:', err);
  process.exit(1);
});
