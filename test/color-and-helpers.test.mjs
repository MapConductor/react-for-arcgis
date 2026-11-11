import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGeoPoint, createGeoRectBounds } from '@mapconductor/js-sdk-core';
import { buildSources } from './support/buildSources.mjs';

// 色文字列 -> ArcGIS の [r, g, b] + opacity 変換（toArcGISFillStyle）と、
// GeoPoint <-> ArcGIS の {x, y, z} / extent の往復、CSS px -> pt の換算を確かめる。
// どれも純粋関数なので地図は要らない。
const { color, helpers, geoPoint } = await buildSources('color-helpers-tests', {
    color: 'src/color.ts',
    helpers: 'src/helpers.ts',
    geoPoint: 'src/GeoPoint.ts',
});
const { toArcGISFillStyle } = color;

test('transparent is black at zero opacity, regardless of case and padding', () => {
    assert.deepEqual(toArcGISFillStyle('transparent'), { color: [0, 0, 0], opacity: 0 });
    assert.deepEqual(toArcGISFillStyle('  TRANSPARENT '), { color: [0, 0, 0], opacity: 0 });
});

test('rgba() keeps the channels and reads alpha as a fraction or a percentage', () => {
    assert.deepEqual(toArcGISFillStyle('rgba(255, 128, 0, 0.5)'), { color: [255, 128, 0], opacity: 0.5 });
    assert.deepEqual(toArcGISFillStyle('RGBA(1,2,3,.25)'), { color: [1, 2, 3], opacity: 0.25 });
    assert.deepEqual(toArcGISFillStyle('rgba(10, 20, 30, 40%)'), { color: [10, 20, 30], opacity: 0.4 });
});

test('rgba() alpha is clamped into [0, 1]', () => {
    assert.equal(toArcGISFillStyle('rgba(0, 0, 0, 2)').opacity, 1);
    assert.equal(toArcGISFillStyle('rgba(0, 0, 0, -1)').opacity, 0);
    assert.equal(toArcGISFillStyle('rgba(0, 0, 0, 150%)').opacity, 1);
});

test('#rrggbbaa puts alpha last (CSS order), not first (Android ARGB order)', () => {
    const style = toArcGISFillStyle('#ff000080');
    assert.deepEqual(style.color, [255, 0, 0]);
    assert.ok(Math.abs(style.opacity - 128 / 255) < 1e-12);
    assert.deepEqual(toArcGISFillStyle('#00FF00FF'), { color: [0, 255, 0], opacity: 1 });
    assert.deepEqual(toArcGISFillStyle('#0000ff00'), { color: [0, 0, 255], opacity: 0 });
});

test('#rrggbb is fully opaque', () => {
    assert.deepEqual(toArcGISFillStyle('#1a2B3c'), { color: [0x1a, 0x2b, 0x3c], opacity: 1 });
});

test('anything unrecognised falls back to opaque black', () => {
    for (const input of ['red', '#fff', 'rgb(1, 2, 3)', 'hsl(0, 100%, 50%)', '']) {
        assert.deepEqual(toArcGISFillStyle(input), { color: [0, 0, 0], opacity: 1 }, input);
    }
});

test('CSS pixels become 96-dpi points (3/4)', () => {
    assert.equal(helpers.CSS_PIXELS_TO_POINTS, 0.75);
    assert.equal(48 * helpers.CSS_PIXELS_TO_POINTS, 36);
});

test('geoPointToPoint maps longitude to x and latitude to y, altitude defaults to 0', () => {
    assert.deepEqual(
        helpers.geoPointToPoint(createGeoPoint({ latitude: 35.68, longitude: 139.76 })),
        { x: 139.76, y: 35.68, z: 0 },
    );
    assert.deepEqual(
        helpers.geoPointToPoint(createGeoPoint({ latitude: -1, longitude: 2, altitude: 300 })),
        { x: 2, y: -1, z: 300 },
    );
    const back = helpers.pointToGeoPoint({ x: 139.76, y: 35.68, z: 12 });
    assert.equal(back.latitude, 35.68);
    assert.equal(back.longitude, 139.76);
    assert.equal(back.altitude, 12);
});

test('geoRectToExtent is a WGS84 extent from SW to NE, null while the bounds are empty', () => {
    const empty = createGeoRectBounds();
    assert.equal(helpers.geoRectToExtent(empty), null);

    const bounds = createGeoRectBounds();
    bounds.extend(createGeoPoint({ latitude: 10, longitude: 20 }));
    bounds.extend(createGeoPoint({ latitude: -5, longitude: -30 }));
    assert.deepEqual(helpers.geoRectToExtent(bounds), {
        xmin: -30, ymin: -5, xmax: 20, ymax: 10, spatialReference: { wkid: 4326 },
    });
});

test('extentToGeoRect round-trips through geoRectToExtent', () => {
    const rect = helpers.extentToGeoRect({ xmin: -30, ymin: -5, xmax: 20, ymax: 10 });
    assert.equal(rect.southWest.latitude, -5);
    assert.equal(rect.southWest.longitude, -30);
    assert.equal(rect.northEast.latitude, 10);
    assert.equal(rect.northEast.longitude, 20);
    const extent = helpers.geoRectToExtent(rect);
    assert.deepEqual([extent.xmin, extent.ymin, extent.xmax, extent.ymax], [-30, -5, 20, 10]);
});

test('GeoPoint.ts position helpers pass null through and swap x/y like helpers.ts', () => {
    assert.equal(geoPoint.geoPointToPosition(null), null);
    assert.equal(geoPoint.positionToGeoPoint(null), null);
    assert.deepEqual(geoPoint.geoPointToPosition({ latitude: 1, longitude: 2 }), { x: 2, y: 1, z: 0 });
    assert.deepEqual(geoPoint.positionToGeoPoint({ x: 2, y: 1, z: 5 }), { latitude: 1, longitude: 2, altitude: 5 });
});
