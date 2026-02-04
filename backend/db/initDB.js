import { sql } from "../config/db.js";
import createSchema from "./schema.js";
import seedData from "./seed.js";

async function initDB() {
  try {
    await createSchema(sql);
    await seedData(sql);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("initDB error", error);
    throw error;
  }
}

export default initDB;
