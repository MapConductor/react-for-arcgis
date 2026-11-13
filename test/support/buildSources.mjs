import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { after } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'tsup';

// src/*.ts をエントリごとに tsup でビルドして import する。
// @arcgis/core は Node でもそのまま読める（DOM 不要のジオメトリ・シンボル類）が、
// package.json に exports が無く拡張子なしのサブパス import が Node ESM で解決できない。
// そこで bundle せず外部参照のまま `.js` を補う。js-sdk-core も外部（dist を読む）。
const arcgisSubpathWithExtension = {
    name: 'arcgis-core-js-extension',
    setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^@arcgis\/core\// }, (args) => ({
            path: args.path.endsWith('.js') ? args.path : `${args.path}.js`,
            external: true,
        }));
    },
};

/** entries: { name: 'src/xxx.ts' } -> { name: module namespace } */
export async function buildSources(prefix, entries) {
    mkdirSync(new URL('../../build/', import.meta.url), { recursive: true });
    const outDir = mkdtempSync(fileURLToPath(new URL(`../../build/${prefix}-`, import.meta.url)));
    after(() => rmSync(outDir, { recursive: true, force: true }));
    await build({
        entry: entries,
        outDir, format: ['esm'], platform: 'node', splitting: false,
        dts: false, sourcemap: false, config: false, silent: true,
        external: ['@mapconductor/js-sdk-core', '@mapconductor/js-sdk-react', 'react'],
        // tsup は dependencies を自動で external にする（拡張子なしのまま）ので、
        // いったん noExternal にして上のプラグインに解決させる。
        noExternal: [/^@arcgis\/core\//],
        esbuildPlugins: [arcgisSubpathWithExtension],
    });
    const modules = {};
    for (const name of Object.keys(entries)) {
        modules[name] = await import(pathToFileURL(resolve(outDir, `${name}.mjs`)));
    }
    return modules;
}
