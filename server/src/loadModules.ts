import fs from "fs";
import path from "path";

export async function loadModules(app: any, deps: any) {
  const modulesPath = path.join(process.cwd(), "src/modules");

  if (!fs.existsSync(modulesPath)) return;

  const modules = fs.readdirSync(modulesPath);

  for (const name of modules) {
    const modPath = path.join(modulesPath, name);
    const mod = await import(modPath);

    if (mod.register) {
      await mod.register(app, deps);
    }
  }
}
