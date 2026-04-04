import fs from "fs/promises";

const splitSqlStatements = (sqlText) => {
  const statements = [];
  let current = "";
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  while (i < sqlText.length) {
    const char = sqlText[i];
    const next = sqlText[i + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") {
        lineComment = false;
      }
      i += 1;
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        blockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (dollarTag) {
      if (sqlText.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += char;
      i += 1;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "-" && next === "-") {
        current += char + next;
        lineComment = true;
        i += 2;
        continue;
      }

      if (char === "/" && next === "*") {
        current += char + next;
        blockComment = true;
        i += 2;
        continue;
      }

      if (char === "$") {
        const remainder = sqlText.slice(i);
        const match = remainder.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
        if (match) {
          const tag = match[0];
          current += tag;
          i += tag.length;
          dollarTag = tag;
          continue;
        }
      }
    }

    if (char === "'" && !inDoubleQuote) {
      current += char;
      if (inSingleQuote && next === "'") {
        current += next;
        i += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      i += 1;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      i += 1;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
};

export async function createSchema(sql) {
  try {
    const fileUrl = new URL("./schema.sql", import.meta.url);
    const sqlText = await fs.readFile(fileUrl, "utf8");

    const statements = splitSqlStatements(sqlText);

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
