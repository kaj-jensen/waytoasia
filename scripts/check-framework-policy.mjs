import { readFile } from "node:fs/promises";

const prohibited = name => name === "vinext" || name.startsWith("@vinext/");
const found = new Set();
for (const file of ["package.json", "package-lock.json"]) {
  let value;
  try { value = JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") continue; throw error; }
  for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, version] of Object.entries(value[section] ?? {})) {
      if (prohibited(name) || /^npm:(?:vinext@|@vinext\/)/.test(String(version))) found.add(name);
    }
  }
  for (const [path, entry] of Object.entries(value.packages ?? {})) {
    const name = path.split("node_modules/").at(-1);
    if (prohibited(name) || (entry.name && prohibited(entry.name))) found.add(name);
  }
  for (const [name, command] of Object.entries(value.scripts ?? {})) if (/(?:^|[\s;&|])vinext(?:\s|$)/.test(command)) found.add(`script:${name}`);
}
if (found.size) throw new Error(`Vinext is prohibited in all work for Kaj Jensen: ${[...found].join(", ")}`);
console.log("Framework policy passed: no Vinext dependencies.");
