/**
 * Serves packages' type declarations to the in-browser editor, so hovering over the generated code
 * shows real types. Each package is its own lazily loaded module: `virtual:editor-types` maps
 * package names to loaders, and a loader returns `{ [file:///node_modules/…]: contents }`.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { normalizePath, type Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:editor-types';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const DECLARATION = /\.d\.[cm]?ts$/;
/** Tooling some libraries list as (optional) peers, which generated code never imports. */
const SKIPPED = new Set(['typescript']);

/** Finds a package the way Node does: in `node_modules` folders from `fromDir` upwards. */
function findPackage(name: string, fromDir: string): string | undefined {
  let dir = fromDir;

  while (true) {
    const candidate = join(dir, 'node_modules', name);

    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);

    const parent = dirname(dir);

    if (parent === dir) return undefined;

    dir = parent;
  }
}

function typesPackageName(name: string) {
  return `@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`;
}

function walk(dir: string, visit: (file: string) => void) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;

    const path = join(dir, entry.name);

    if (entry.isDirectory()) walk(path, visit);
    else visit(path);
  }
}

/** A package's declarations and package.json, plus its dependencies', keyed by editor path. */
export function collectTypes(
  name: string,
  fromDir: string,
  files = new Map<string, string>(),
  seen = new Set<string>(),
  watchFile?: (file: string) => void,
) {
  const dir = findPackage(name, fromDir);

  if (!dir || seen.has(dir)) return files;

  seen.add(dir);

  let hasDeclarations = false;

  walk(dir, (file) => {
    const isManifest = file === join(dir, 'package.json');

    if (!isManifest && !DECLARATION.test(file)) return;
    if (!isManifest) hasDeclarations = true;

    const path = relative(dir, file).split(sep).join('/');

    watchFile?.(file);
    files.set(`file:///node_modules/${name}/${path}`, readFileSync(file, 'utf8'));
  });

  // Packages without declarations (e.g. `react`) ship them in `@types`.
  if (!hasDeclarations && !name.startsWith('@types/')) {
    collectTypes(typesPackageName(name), fromDir, files, seen, watchFile);
  }

  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

  for (const dependency of Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })) {
    if (!SKIPPED.has(dependency)) collectTypes(dependency, dir, files, seen, watchFile);
  }

  return files;
}

/** Makes the types of `packages` (as seen from `root`) loadable in the browser. */
export function editorTypes(packages: readonly string[], root = process.cwd()): Plugin {
  const declarationFiles = new Set<string>();
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    name: 'editor-types',
    configureServer(server) {
      server.httpServer?.once('close', () => clearTimeout(reloadTimer));
    },
    handleHotUpdate({ file, server }) {
      if (!declarationFiles.has(normalizePath(file))) {
        return;
      }

      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        for (const module of server.moduleGraph.idToModuleMap.values()) {
          if (module.id?.startsWith(RESOLVED_ID)) {
            server.moduleGraph.invalidateModule(module);
          }
        }

        // Reload the page to replace Monaco's already-loaded extra libraries too.
        server.ws.send({ type: 'full-reload' });
      }, 200);

      return [];
    },
    resolveId(id) {
      return id === VIRTUAL_ID || id.startsWith(`${VIRTUAL_ID}/`) ? `\0${id}` : undefined;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const loaders = packages.map(
          (name) => `  ${JSON.stringify(name)}: () => import(${JSON.stringify(`${VIRTUAL_ID}/${name}`)}),`,
        );

        return `export const loaders = {\n${loaders.join('\n')}\n};`;
      }

      if (id.startsWith(`${RESOLVED_ID}/`)) {
        const name = id.slice(RESOLVED_ID.length + 1);

        const files = collectTypes(name, root, undefined, undefined, (file) => {
          declarationFiles.add(normalizePath(file));
          this.addWatchFile(file);
        });

        return `export default ${JSON.stringify(Object.fromEntries(files))};`;
      }

      return undefined;
    },
  };
}
