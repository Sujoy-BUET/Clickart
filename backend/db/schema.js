import fs from "fs/promises";

export async function createSchema(sql) {
  try {
    const fileUrl = new URL("./schema.sql", import.meta.url);
    const sqlText = await fs.readFile(fileUrl, "utf8");

    // Split statements on semicolons. Keep simple: ignore empty statements.
    const statements = sqlText.split(";").map(s => s.trim()).filter(Boolean);

    for (const stmt of statements) {
      if (typeof sql.unsafe === "function") {
        await sql.unsafe(stmt);
      } else if (typeof sql === "function") {
        // Some clients expose a direct call; try it as a fallback.
        await sql(stmt);
      } else {
        throw new Error("SQL client does not support executing raw statements. Update schema.js accordingly.");
      }
    }
  } catch (error) {
    console.error("Error creating tables from schema.sql", error);
    throw error;
  }
}

export default createSchema;
