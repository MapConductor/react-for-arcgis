import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    CIRCLE_TILE_LAYER_ID,
    POLYGON_TILE_LAYER_ID,
    POLYLINE_TILE_LAYER_ID,
    RasterLayerSource,
    TileScheme,
    createGeoPoint,
    createGeoRectBounds,
    createGroundImageState,
    createMarkerState,
    createRasterLayerState,
} from '@mapconductor/js-sdk-core';
import { buildSources } from './support/buildSources.mjs';
import { fakeGraphicsLayer } from './support/fakeGraphicsLayer.mjs';

// マーカー・地表画像・ラスターのレンダラーを、地図側だけ差し替えて実クラスで動かす。
// - マーカー: 2D は picture-marker（アンカーを x/yoffset に、tilt ぶん縦に伸ばす）、
//   3D は point-3d + icon（anchorPosition はアイコン中心基準）。サイズは CSS px -> pt。
// - 地表画像: bounds を WGS84 の extent にして ImageElement を MediaLayer の要素へ足す。
// - ラスター: {z}/{x}/{y} を WebTileLayer の {level}/{col}/{row} に書き換え、Web Mercator の
//   TileInfo（256px 基準の LOD）を付ける。TMS / TileJSON は描かない。積む位置は
//   OVERLAY_STACK_ORDER（raster < groundImage < polygon < circle < polyline < marker）。
const { marker, groundImage, raster } = await buildSources('marker-gi-raster-tests', {
    marker: 'src/marker/ArcGISMarkerRenderer.ts',
    groundImage: 'src/groundimage/ArcGISGroundImageOverlayRenderer.ts',
    raster: 'src/raster/ArcGISRasterLayerOverlayRenderer.ts',
});

const pt = (latitude, longitude) => createGeoPoint({ latitude, longitude });
const icon = ({ width = 40, height = 60, anchor = { x: 0.5, y: 1 }, url = 'https://example.test/pin.png' } = {}) =>
    ({ url, size: { width, height }, anchor });

function markerRenderer(type) {
    const layer = fakeGraphicsLayer();
    const renderer = new marker.ArcGISMarkerRenderer({ map: { type } }, layer);
    return { layer, renderer };
}

test('marker 2D: picture-marker sized in points, offset so the anchor sits on the position', async () => {
    const { layer, renderer } = markerRenderer('2d');
    const state = createMarkerState({ id: 'm1', position: pt(35.68, 139.76) });
    const [graphic] = await renderer.onAdd([{ state, bitmapIcon: icon() }]);
    assert.equal(layer.items[0], graphic);
    assert.equal(graphic.attributes.id, 'm1');
    assert.equal(graphic.geometry.longitude, 139.76);
    assert.equal(graphic.geometry.latitude, 35.68);
    assert.equal(graphic.geometry.spatialReference.wkid, 4326);

    const symbol = graphic.symbol;
    assert.equal(symbol.type, 'picture-marker');
    assert.equal(symbol.url, 'https://example.test/pin.png');
    assert.equal(symbol.width, 30);
    assert.equal(symbol.height, 45);
    // Bottom-centre pin: no horizontal shift, raised by half its height.
    assert.equal(symbol.xoffset, 0);
    assert.equal(symbol.yoffset, 22.5);
});

test('marker 2D: a top-left anchor shifts right and down by half the icon', () => {
    const { renderer } = markerRenderer('2d');
    const graphic = renderer.createMarker({ state: createMarkerState({ position: pt(0, 0) }) }, icon({ anchor: { x: 0, y: 0 } }));
    assert.equal(graphic.symbol.xoffset, 15);
    assert.equal(graphic.symbol.yoffset, -22.5);
});

test('marker 2D: tilt stretches height and yoffset by 1/cos(tilt); rebuildSymbol applies it', () => {
    const { renderer } = markerRenderer('2d');
    const graphic = renderer.createMarker({ state: createMarkerState({ position: pt(0, 0) }) }, icon());
    assert.equal(renderer.setVerticalStretchForTilt(0), false, 'unchanged stretch reports false');
    assert.equal(renderer.setVerticalStretchForTilt(60), true);
    assert.equal(renderer.setVerticalStretchForTilt(60), false);
    renderer.rebuildSymbol(graphic, icon());
    assert.ok(Math.abs(graphic.symbol.height - 90) < 1e-9);
    assert.ok(Math.abs(graphic.symbol.yoffset - 45) < 1e-9);
    assert.equal(graphic.symbol.width, 30);
});

test('marker 3D: point-3d icon with a centre-relative anchor and no tilt stretch', () => {
    const { renderer } = markerRenderer('3d');
    assert.equal(renderer.setVerticalStretchForTilt(60), false);
    const graphic = renderer.createMarker({ state: createMarkerState({ position: pt(0, 0) }) }, icon());
    assert.equal(graphic.symbol.type, 'point-3d');
    const [layer] = graphic.symbol.symbolLayers.toArray();
    assert.equal(layer.type, 'icon');
    assert.equal(layer.size, 45);
    assert.equal(layer.anchor, 'relative');
    assert.deepEqual({ x: layer.anchorPosition.x, y: layer.anchorPosition.y }, { x: 0, y: 0.5 });
    assert.equal(layer.resource.href, 'https://example.test/pin.png');
});

test('marker 3D: an icon without a URL falls back to a red circle primitive', () => {
    const { renderer } = markerRenderer('3d');
    const graphic = renderer.createMarker({ state: createMarkerState({ position: pt(0, 0) }) }, icon({ url: '' }));
    const [layer] = graphic.symbol.symbolLayers.toArray();
    assert.equal(layer.resource.primitive, 'circle');
    assert.deepEqual(layer.material.color.toRgba(), [255, 0, 0, 1]);
});

test('marker: position, visibility, change and removal reach the graphic', async () => {
    const { layer, renderer } = markerRenderer('2d');
    const state = createMarkerState({ position: pt(0, 0) });
    const graphic = renderer.createMarker({ state }, icon());
    const entity = { state, marker: graphic };

    renderer.setMarkerPosition(entity, pt(1, 2));
    assert.deepEqual([graphic.geometry.latitude, graphic.geometry.longitude], [1, 2]);
    renderer.setMarkerPosition({ state, marker: null }, pt(5, 5)); // no graphic: ignored

    renderer.setMarkerVisible(entity, false);
    assert.equal(graphic.visible, false);
    renderer.setMarkerVisible(entity, true);
    assert.equal(graphic.visible, true);

    const [same] = await renderer.onChange([{
        current: { state: createMarkerState({ position: pt(3, 4) }), marker: graphic },
        bitmapIcon: icon({ width: 20, height: 20 }),
    }]);
    assert.equal(same, graphic);
    assert.deepEqual([graphic.geometry.latitude, graphic.geometry.longitude], [3, 4]);
    assert.equal(graphic.symbol.width, 15);

    await renderer.onRemove([{ marker: null }, { marker: graphic }]);
    assert.equal(layer.items.length, 0);
});

function fakeElements() {
    const items = [];
    return { items, add: (e) => items.push(e), remove: (e) => items.splice(items.indexOf(e), 1) };
}

function bounds(south, west, north, east) {
    const b = createGeoRectBounds();
    b.extend(pt(south, west));
    b.extend(pt(north, east));
    return b;
}

test('ground image: georeferenced to the WGS84 extent of its bounds, with opacity', async () => {
    const elements = fakeElements();
    const renderer = new groundImage.ArcGISGroundImageOverlayRenderer({ map: {} }, elements);
    const state = createGroundImageState({ bounds: bounds(35, 139, 36, 140), imageUrl: 'https://example.test/a.png', opacity: 0.4 });
    const [element] = await renderer.onAdd([{ state }]);
    assert.equal(elements.items[0], element);
    assert.equal(element.image, 'https://example.test/a.png');
    assert.equal(element.opacity, 0.4);
    const { extent } = element.georeference;
    assert.deepEqual([extent.xmin, extent.ymin, extent.xmax, extent.ymax], [139, 35, 140, 36]);
    assert.equal(extent.spatialReference.wkid, 4326);

    const [same] = await renderer.onChange([{
        current: { state: createGroundImageState({ bounds: bounds(0, 0, 1, 2), imageUrl: 'https://example.test/b.png', opacity: 1 }), groundImage: element },
    }]);
    assert.equal(same, element);
    assert.equal(element.image, 'https://example.test/b.png');
    assert.equal(element.opacity, 1);
    assert.equal(element.georeference.extent.xmax, 2);

    await renderer.onRemove([{ groundImage: element }]);
    assert.equal(elements.items.length, 0);
});

test('ground image: empty bounds or no URL draws nothing', () => {
    const elements = fakeElements();
    const renderer = new groundImage.ArcGISGroundImageOverlayRenderer({ map: {} }, elements);
    assert.equal(renderer.createGroundImage({ state: { bounds: createGeoRectBounds(), imageUrl: 'x', opacity: 1 } }), null);
    assert.equal(renderer.createGroundImage({ state: { bounds: bounds(0, 0, 1, 1), imageUrl: '', opacity: 1 } }), null);
    assert.equal(elements.items.length, 0);
});

// MapView.map の代わり: layers.toArray() と add(layer, index) / remove(layer) だけ。
function fakeMap(existingIds = []) {
    const layers = existingIds.map((id) => ({ id }));
    return {
        layers: { toArray: () => [...layers] },
        add(layer, index) { layers.splice(index ?? layers.length, 0, layer); },
        remove(layer) { const i = layers.indexOf(layer); if (i >= 0) layers.splice(i, 1); },
        ids: () => layers.map((l) => l.id),
        list: layers,
    };
}

const quiet = async (fn) => {
    const { warn, error } = console;
    const messages = [];
    console.warn = (...args) => messages.push(args.join(' '));
    console.error = (...args) => messages.push(args.join(' '));
    try { return { result: await fn(), messages }; } finally { console.warn = warn; console.error = error; }
};

test('raster: XYZ templates become WebTileLayer tokens over a 256px Web Mercator tiling', async () => {
    const map = fakeMap();
    const renderer = new raster.ArcGISRasterLayerOverlayRenderer({ map: { map } });
    const state = createRasterLayerState({
        id: 'osm',
        source: RasterLayerSource.UrlTemplate({ template: 'https://tile.example/{z}/{x}/{y}.png?z={z}', minZoom: 2, maxZoom: 5 }),
    });
    const [layer] = await renderer.onAdd([{ state }]);
    assert.equal(map.list[0], layer);
    assert.equal(layer.urlTemplate, 'https://tile.example/{level}/{col}/{row}.png?z={level}');

    const { tileInfo, fullExtent } = layer;
    assert.equal(tileInfo.spatialReference.wkid, 3857);
    assert.deepEqual(tileInfo.size, [256, 256]);
    assert.equal(tileInfo.dpi, 96);
    assert.deepEqual(tileInfo.lods.map((l) => l.level), [2, 3, 4, 5]);
    const r0 = (2 * Math.PI * 6378137) / 256;
    assert.ok(Math.abs(tileInfo.lods[0].resolution - r0 / 4) < 1e-6);
    assert.ok(Math.abs(tileInfo.lods[0].scale - (r0 / 4) * 96 * 39.37) < 1e-3);
    assert.ok(Math.abs(tileInfo.origin.x + 20037508.342789244) < 1e-3);
    assert.ok(Math.abs(tileInfo.origin.y - 20037508.342789244) < 1e-3);
    assert.ok(Math.abs(fullExtent.xmax - 20037508.342789244) < 1e-3);
    assert.equal(fullExtent.spatialReference.wkid, 3857);
});

test('raster: zoom range defaults to 0..22', async () => {
    const renderer = new raster.ArcGISRasterLayerOverlayRenderer({ map: { map: fakeMap() } });
    const layer = await renderer.createRasterLayer({ state: createRasterLayerState({ source: RasterLayerSource.UrlTemplate({ template: 'https://t/{z}/{x}/{y}' }) }) });
    assert.deepEqual([layer.tileInfo.lods[0].level, layer.tileInfo.lods.at(-1).level, layer.tileInfo.lods.length], [0, 22, 23]);
});

test('raster: ArcGIS services use /tile/{level}/{row}/{col}; TMS and TileJSON are not drawn', async () => {
    const map = fakeMap();
    const renderer = new raster.ArcGISRasterLayerOverlayRenderer({ map: { map } });
    const service = await renderer.createRasterLayer({ state: createRasterLayerState({ source: RasterLayerSource.ArcGisService('https://services.example/MapServer//') }) });
    assert.equal(service.urlTemplate, 'https://services.example/MapServer/tile/{level}/{row}/{col}');

    const { result, messages } = await quiet(() => renderer.onAdd([
        { state: createRasterLayerState({ source: RasterLayerSource.UrlTemplate({ template: 'https://t/{z}/{x}/{y}', scheme: TileScheme.TMS }) }) },
        { state: createRasterLayerState({ source: RasterLayerSource.TileJson('https://t/tiles.json') }) },
    ]));
    assert.deepEqual(result, [null, null]);
    assert.equal(messages.length, 2);
    assert.equal(map.list.length, 1);
});

test('raster: invisible layers are not created, and a change removes the old layer first', async () => {
    const map = fakeMap();
    const renderer = new raster.ArcGISRasterLayerOverlayRenderer({ map: { map } });
    const source = RasterLayerSource.UrlTemplate({ template: 'https://t/{z}/{x}/{y}' });
    const [hidden] = await renderer.onAdd([{ state: createRasterLayerState({ source, visible: false }) }]);
    assert.equal(hidden, null);
    assert.equal(map.list.length, 0);

    const [first] = await renderer.onAdd([{ state: createRasterLayerState({ source }) }]);
    const [second] = await renderer.onChange([{ prev: { layer: first }, current: { state: createRasterLayerState({ source: RasterLayerSource.UrlTemplate({ template: 'https://u/{z}/{x}/{y}' }) }) } }]);
    assert.deepEqual(map.list, [second]);
    assert.equal(second.urlTemplate, 'https://u/{level}/{col}/{row}');

    const [gone] = await renderer.onChange([{ prev: { layer: second }, current: { state: createRasterLayerState({ source, visible: false }) } }]);
    assert.equal(gone, null);
    assert.equal(map.list.length, 0);
});

test('raster: stacks under the overlay graphics layers, ordered by zIndex among rasters', async () => {
    const map = fakeMap(['basemap-extra', 'ground-image-layer', 'polygon-layer', 'circle-layer', 'polyline-layer', 'marker-layer']);
    const renderer = new raster.ArcGISRasterLayerOverlayRenderer({ map: { map } });
    const add = async (id, zIndex = 0) => {
        const [layer] = await renderer.onAdd([{ state: createRasterLayerState({ id, zIndex, source: RasterLayerSource.UrlTemplate({ template: `https://t/${id}/{z}/{x}/{y}` }) }) }]);
        layer.id = id;
        return layer;
    };
    await add('raster-a', 1);
    await add('raster-b', 0);
    await add('raster-c', 1); // same zIndex as a: added later goes above
    await add(POLYGON_TILE_LAYER_ID);
    await add(CIRCLE_TILE_LAYER_ID);
    await add(POLYLINE_TILE_LAYER_ID);
    await add('mc-marker-tiles');
    assert.deepEqual(map.ids(), [
        'basemap-extra',
        'raster-b', 'raster-a', 'raster-c',
        'ground-image-layer',
        POLYGON_TILE_LAYER_ID, 'polygon-layer',
        CIRCLE_TILE_LAYER_ID, 'circle-layer',
        POLYLINE_TILE_LAYER_ID, 'polyline-layer',
        'mc-marker-tiles', 'marker-layer',
    ]);

    // Removing forgets the layer's key; a re-added raster still lands in the raster band.
    await renderer.onRemove([{ layer: map.list.find((l) => l.id === 'raster-a') }]);
    await add('raster-d', 5);
    assert.deepEqual(map.ids().slice(0, 5), ['basemap-extra', 'raster-b', 'raster-c', 'raster-d', 'ground-image-layer']);
});

test('raster: with no map attached the layer is still built and returned', async () => {
    const renderer = new raster.ArcGISRasterLayerOverlayRenderer({ map: { map: null } });
    const layer = await renderer.createRasterLayer({ state: createRasterLayerState({ source: RasterLayerSource.UrlTemplate({ template: 'https://t/{z}/{x}/{y}' }) }) });
    assert.ok(layer);
});
