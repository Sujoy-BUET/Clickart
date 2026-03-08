import fs from "fs/promises";

export async function createSchema(sql) {
  try {
    const fileUrl = new URL("./schema.sql", import.meta.url);
    const sqlText = await fs.readFile(fileUrl, "utf8");

    const statements = sqlText
      .split(";")
      .map((s) =>
        s
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim()
      )
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await sql.query(stmt);
    }

    console.log("Schema created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}

export default createSchema;
