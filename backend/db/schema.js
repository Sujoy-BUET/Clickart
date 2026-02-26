import fs from "fs/promises";

export async function createSchema(sql) {
  try {
    const fileUrl = new URL("./schema.sql", import.meta.url);
    const sqlText = await fs.readFile(fileUrl, "utf8");

    // Split statements on semicolons, filter out empty/comment-only entries.
    const statements = sqlText
      .split(";")
      .map((s) =>
        s
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))  // strip comment lines
          .join("\n")
          .trim()
      )
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      // neon serverless driver exposes sql.query() for conventional (non-tagged-template) calls
      await sql.query(stmt);
    }

    console.log("Schema created / refreshed successfully");
  } catch (error) {
    console.error("Error creating tables from schema.sql", error);
    throw error;
  }
}

export default createSchema;
