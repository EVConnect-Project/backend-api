import { AppDataSource } from "../data-source";

async function runMigrations() {
  await AppDataSource.initialize();
  try {
    const migrations = await AppDataSource.runMigrations();
    console.log(`Applied ${migrations.length} migrations`);
  } finally {
    await AppDataSource.destroy();
  }
}

runMigrations()
  .then(() => {
    console.log("Migration run completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration run failed:", error);
    process.exit(1);
  });
