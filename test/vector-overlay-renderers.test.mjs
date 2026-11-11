import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    computeDistanceBetween,
    createCircleState,
    createGeoPoint,
    createPolygonState,
    createPolylineState,
} from '@mapconductor/js-sdk-core';
import { buildSources } from './support/buildSources.mjs';
import { fakeGraphicsLayer } from './support/fakeGraphicsLayer.mjs';

// ポリゴン・ポリライン・円のレンダラーを、GraphicsLayer だけ差し替えて実クラスで動かす。
// Graphic とジオメトリは本物の @arcgis/core（Node で動く）なので、autocast 後の
// rings / paths / シンボルをそのまま読める。確かめるのは:
// - ポリゴン: リングを閉じる、外周は時計回り・穴は反時計回り、zIndex 順の並べ替え
// - ポリライン: 2 点未満は描かない、日付変更線をまたいでも経度が連続する
// - 円: geodesic は WGS84 のまま、planar は Web Mercator に投影してから buffer
// - いずれも線幅は CSS px -> pt（3/4）、色は toArcGISFillStyle 経由
const { polygon, polyline, circle } = await buildSources('vector-renderer-tests', {
    polygon: 'src/polygon/ArcGISPolygonOverlayRenderer.ts',
    polyline: 'src/polyline/ArcGISPolylineOverlayRenderer.ts',
    circle: 'src/circle/ArcGISCircleOverlayRenderer.ts',
});

const holder = { map: { type: '2d' } };
const pt = (latitude, longitude) => createGeoPoint({ latitude, longitude });

function signedArea(ring) {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[i + 1];
        sum += x1 * y2 - x2 * y1;
    }
    return sum / 2;
}

const rgba = (color) => color.toRgba();

// Counter-clockwise in lon/lat (east, then north, then west).
const ccwSquare = [pt(0, 0), pt(0, 10), pt(10, 10), pt(10, 0)];

test('polygon: rings are closed, the outer ring is clockwise and holes counter-clockwise', async () => {
    const layer = fakeGraphicsLayer();
    const renderer = new polygon.ArcGISPolygonOverlayRenderer(holder, layer);
    const hole = [pt(2, 2), pt(4, 2), pt(4, 4), pt(2, 4)]; // clockwise as given
    const state = createPolygonState({ id: 'p1', points: ccwSquare, holes: [hole], geodesic: false });
    const [graphic] = await renderer.onAdd([{ state }]);

    assert.equal(layer.items.length, 1);
    assert.equal(layer.items[0], graphic);
    assert.equal(graphic.attributes.id, 'p1');
    const { rings, spatialReference } = graphic.geometry;
    assert.equal(spatialReference.wkid, 4326);
    assert.equal(rings.length, 2);
    for (const ring of rings) assert.deepEqual(ring[0], ring[ring.length - 1]);
    assert.ok(signedArea(rings[0]) < 0, 'outer ring must be clockwise');
    assert.ok(signedArea(rings[1]) > 0, 'hole must be counter-clockwise');
    // Same vertices as the input square (non-geodesic, short edges: nothing to densify).
    const corners = new Set(rings[0].map(([x, y]) => `${x},${y}`));
    for (const p of ccwSquare) assert.ok(corners.has(`${p.longitude},${p.latitude}`));
});

test('polygon: a clockwise input stays clockwise, and a geodesic edge is densified', async () => {
    const renderer = new polygon.ArcGISPolygonOverlayRenderer(holder, fakeGraphicsLayer());
    const cw = [...ccwSquare].reverse();
    const flat = renderer.createPolygon({ state: createPolygonState({ points: cw, geodesic: false }) });
    assert.ok(signedArea(flat.geometry.rings[0]) < 0);

    const wide = [pt(50, -60), pt(50, 60), pt(60, 60), pt(60, -60)];
    const straight = renderer.createPolygon({ state: createPolygonState({ points: wide, geodesic: false }) });
    const curved = renderer.createPolygon({ state: createPolygonState({ points: wide, geodesic: true }) });
    // Non-geodesic edges are densified too, but along straight lat/lng lines; the great
    // circle between two points at 60N bows toward the pole.
    const maxLat = (graphic) => Math.max(...graphic.geometry.rings[0].map(([, y]) => y));
    assert.ok(Math.abs(maxLat(straight) - 60) < 1e-9);
    assert.ok(maxLat(curved) > 61, `geodesic edge should bulge north, max lat ${maxLat(curved)}`);
});

test('polygon: fewer than 3 points draws nothing and leaves an existing graphic alone', () => {
    const layer = fakeGraphicsLayer();
    const renderer = new polygon.ArcGISPolygonOverlayRenderer(holder, layer);
    assert.equal(renderer.createPolygon({ state: createPolygonState({ points: [pt(0, 0), pt(1, 1)] }) }), null);
    assert.equal(layer.items.length, 0);

    const graphic = renderer.createPolygon({ state: createPolygonState({ points: ccwSquare }) });
    const before = graphic.geometry;
    renderer.updatePolygon(graphic, { state: createPolygonState({ points: [pt(0, 0)] }) });
    assert.equal(graphic.geometry, before);
});

test('polygon: symbol carries fill and outline colors with the width in points', () => {
    const renderer = new polygon.ArcGISPolygonOverlayRenderer(holder, fakeGraphicsLayer());
    const graphic = renderer.createPolygon({
        state: createPolygonState({
            points: ccwSquare, fillColor: 'rgba(255, 0, 0, 0.5)', strokeColor: '#00ff00', strokeWidth: 4,
        }),
    });
    assert.equal(graphic.symbol.type, 'simple-fill');
    assert.deepEqual(rgba(graphic.symbol.color), [255, 0, 0, 0.5]);
    assert.deepEqual(rgba(graphic.symbol.outline.color), [0, 255, 0, 1]);
    assert.equal(graphic.symbol.outline.width, 3);
});

test('polygon: onPostProcess orders graphics by zIndex, and only rewrites when out of order', async () => {
    const layer = fakeGraphicsLayer();
    const renderer = new polygon.ArcGISPolygonOverlayRenderer(holder, layer);
    const [top, bottom, middle] = await renderer.onAdd([
        { state: createPolygonState({ id: 'top', points: ccwSquare, zIndex: 5 }) },
        { state: createPolygonState({ id: 'bottom', points: ccwSquare, zIndex: -1 }) },
        { state: createPolygonState({ id: 'middle', points: ccwSquare }) },
    ]);
    await renderer.onPostProcess();
    assert.deepEqual(layer.items.map((g) => g.attributes.id), ['bottom', 'middle', 'top']);

    let rewrites = 0;
    const removeAll = layer.graphics.removeAll;
    layer.graphics.removeAll = function () { rewrites++; return removeAll.call(this); };
    await renderer.onPostProcess();
    assert.equal(rewrites, 0);

    // A zIndex change through onChange re-sorts on the next pass.
    await renderer.onChange([{ current: { state: createPolygonState({ id: 'bottom', points: ccwSquare, zIndex: 10 }), polygon: bottom } }]);
    await renderer.onPostProcess();
    assert.equal(rewrites, 1);
    assert.deepEqual(layer.items.map((g) => g.attributes.id), ['middle', 'top', 'bottom']);
    assert.ok([top, middle].every((g) => layer.items.includes(g)));

    await renderer.onRemove([{ polygon: top }]);
    assert.deepEqual(layer.items.map((g) => g.attributes.id), ['middle', 'bottom']);
});

test('polyline: fewer than 2 points draws nothing; otherwise a WGS84 path in lon/lat', async () => {
    const layer = fakeGraphicsLayer();
    const renderer = new polyline.ArcGISPolylineOverlayRenderer(holder, layer);
    const [none] = await renderer.onAdd([{ state: createPolylineState({ points: [pt(0, 0)] }) }]);
    assert.equal(none, null);
    assert.equal(layer.items.length, 0);

    const [line] = await renderer.onAdd([{
        state: createPolylineState({ id: 'l1', points: [pt(35, 139), pt(36, 140)], strokeColor: '#0000ff80', strokeWidth: 8 }),
    }]);
    assert.equal(line.attributes.id, 'l1');
    assert.equal(line.geometry.spatialReference.wkid, 4326);
    assert.deepEqual(line.geometry.paths[0][0], [139, 35]);
    assert.deepEqual(line.geometry.paths[0].at(-1), [140, 36]);
    assert.equal(line.symbol.type, 'simple-line');
    assert.equal(line.symbol.style, 'solid');
    assert.equal(line.symbol.width, 6);
    const [r, g, b, a] = rgba(line.symbol.color);
    assert.deepEqual([r, g, b], [0, 0, 255]);
    assert.ok(Math.abs(a - 128 / 255) < 0.01);
});

test('polyline: crossing the antimeridian keeps longitudes continuous (unwrapped past 180)', () => {
    const renderer = new polyline.ArcGISPolylineOverlayRenderer(holder, fakeGraphicsLayer());
    const line = renderer.createPolyline({ state: createPolylineState({ points: [pt(0, 179), pt(0, -179)], geodesic: false }) });
    const xs = line.geometry.paths[0].map(([x]) => x);
    assert.equal(xs[0], 179);
    assert.ok(Math.abs(xs.at(-1) - 181) < 1e-9, `last x ${xs.at(-1)}`);
    for (let i = 1; i < xs.length; i++) assert.ok(Math.abs(xs[i] - xs[i - 1]) < 180);
});

test('polyline: update replaces geometry and symbol; onChange creates when there is no graphic yet', async () => {
    const layer = fakeGraphicsLayer();
    const renderer = new polyline.ArcGISPolylineOverlayRenderer(holder, layer);
    const graphic = renderer.createPolyline({ state: createPolylineState({ points: [pt(0, 0), pt(1, 1)], strokeWidth: 2 }) });
    const [same] = await renderer.onChange([{ current: { state: createPolylineState({ points: [pt(0, 0), pt(2, 2), pt(3, 3)], strokeWidth: 4 }), polyline: graphic } }]);
    assert.equal(same, graphic);
    assert.deepEqual(graphic.geometry.paths[0].at(-1), [3, 3]);
    assert.equal(graphic.symbol.width, 3);

    const [created] = await renderer.onChange([{ current: { state: createPolylineState({ points: [pt(0, 0), pt(1, 1)] }), polyline: null } }]);
    assert.notEqual(created, graphic);
    assert.equal(layer.items.length, 2);
    await renderer.onRemove([{ polyline: graphic }, { polyline: created }]);
    assert.equal(layer.items.length, 0);
});

test('circle: geodesic buffer stays in WGS84 and spans the radius on the ground', () => {
    const renderer = new circle.ArcGISCircleOverlayRenderer(holder, fakeGraphicsLayer());
    const center = pt(35, 139);
    const graphic = renderer.createCircle({ state: createCircleState({ id: 'c1', center, radiusMeters: 10_000, geodesic: true }) });
    const { geometry } = graphic;
    assert.equal(geometry.type, 'polygon');
    assert.equal(geometry.spatialReference.wkid, 4326);
    assert.equal(graphic.attributes.id, 'c1');
    for (const [x, y] of geometry.rings[0]) {
        const distance = computeDistanceBetween(center, pt(y, x));
        assert.ok(Math.abs(distance - 10_000) < 100, `vertex ${x},${y} is ${distance} m away`);
    }
});

test('circle: a planar circle is buffered in Web Mercator meters, not degrees', () => {
    const renderer = new circle.ArcGISCircleOverlayRenderer(holder, fakeGraphicsLayer());
    const graphic = renderer.createCircle({ state: createCircleState({ center: pt(0, 0), radiusMeters: 1_000, geodesic: false }) });
    const { geometry } = graphic;
    assert.ok(geometry.spatialReference.isWebMercator);
    assert.ok(Math.abs(geometry.extent.width - 2_000) < 1, `width ${geometry.extent.width}`);
    assert.ok(Math.abs(geometry.extent.center.x) < 1e-6);
});

// createCircleState fills in its own colors; the renderer's fallbacks apply to a bare state.
test('circle: with no colors the symbol is a transparent fill with a black 1px outline', () => {
    const renderer = new circle.ArcGISCircleOverlayRenderer(holder, fakeGraphicsLayer());
    const graphic = renderer.createCircle({ state: { id: 'bare', center: pt(0, 0), radiusMeters: 500, geodesic: true } });
    assert.equal(graphic.symbol.color.a, 0);
    assert.deepEqual(rgba(graphic.symbol.outline.color), [0, 0, 0, 1]);
    assert.equal(graphic.symbol.outline.width, 0.75);
});

test('circle: state colors reach the symbol', () => {
    const renderer = new circle.ArcGISCircleOverlayRenderer(holder, fakeGraphicsLayer());
    const graphic = renderer.createCircle({
        state: createCircleState({ center: pt(0, 0), radiusMeters: 500, fillColor: 'rgba(0, 0, 255, 0.25)', strokeColor: '#ff0000', strokeWidth: 2 }),
    });
    assert.deepEqual(rgba(graphic.symbol.color), [0, 0, 255, 0.25]);
    assert.deepEqual(rgba(graphic.symbol.outline.color), [255, 0, 0, 1]);
    assert.equal(graphic.symbol.outline.width, 1.5);
});

test('circle: onChange updates in place; onRemove skips missing graphics', async () => {
    const layer = fakeGraphicsLayer();
    const renderer = new circle.ArcGISCircleOverlayRenderer(holder, layer);
    const [graphic] = await renderer.onAdd([{ state: createCircleState({ center: pt(0, 0), radiusMeters: 500, geodesic: true }) }]);
    const width = graphic.geometry.extent.width;
    const [same] = await renderer.onChange([{ current: { state: createCircleState({ center: pt(0, 0), radiusMeters: 1_000, geodesic: true }), circle: graphic } }]);
    assert.equal(same, graphic);
    assert.ok(Math.abs(graphic.geometry.extent.width / width - 2) < 0.01);
    await renderer.onRemove([{ circle: null }, { circle: graphic }]);
    assert.equal(layer.items.length, 0);
});
