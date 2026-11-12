import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AbstractZoomAltitudeConverter, computeDistanceBetween, createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';
import { buildSources } from './support/buildSources.mjs';

// ズーム <-> 高度（3D SceneView）と ズーム <-> scale（2D MapView）の換算。
// - SceneView: 視野角は対角 55°。ビューポートの対角長が分かればそこから zoom0 高度を決め、
//   高さだけなら 720px 基準で比例、何も無ければ較正済みの既定値を使う。
// - MapView: Web Mercator の解像度 × 96dpi × 39.37 in/m。プログラムからの移動は整数ズームへ丸める
//   （Google 2D と揃える）が、fitBounds は snapZoom:false で端数を保つ。
const { zoom, controller } = await buildSources('zoom-tests', {
    zoom: 'src/zoom/ZoomAltitudeConverter.ts',
    controller: 'src/ArcGISMapViewController.ts',
});
const { ZoomAltitudeConverter } = zoom;
const { arcGISZoomToScale, arcGISScaleToZoom } = controller;

const close = (actual, expected, eps = 1e-9, message) =>
    assert.ok(Math.abs(actual - expected) <= eps * Math.max(1, Math.abs(expected)), message ?? `${actual} !~ ${expected}`);

test('without a viewport the calibrated zoom-0 altitude is halved per level', () => {
    const converter = new ZoomAltitudeConverter();
    const z0 = ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE;
    close(converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 0 }), z0 / 1024);
    close(converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 60 }), (z0 * 0.5) / 1024);
    close(converter.distanceToZoomLevel({ distance: z0 / 1024, latitude: 0 }), 10);
});

test('zoom <-> altitude round-trips at any latitude and tilt within range', () => {
    const converter = new ZoomAltitudeConverter();
    for (const latitude of [0, 35.7, -60]) {
        for (const tilt of [0, 30, 60]) {
            for (const zoomLevel of [3, 8.5, 15]) {
                const altitude = converter.zoomLevelToAltitude({ zoomLevel, latitude, tilt });
                close(converter.altitudeToZoomLevel({ altitude, latitude, tilt }), zoomLevel, 1e-9,
                    `lat=${latitude} tilt=${tilt} zoom=${zoomLevel}`);
            }
        }
    }
});

test('tilt lowers the camera by cos(tilt) for the same ground distance', () => {
    const converter = new ZoomAltitudeConverter();
    const flat = converter.zoomLevelToAltitude({ zoomLevel: 12, latitude: 0, tilt: 0 });
    const tilted = converter.zoomLevelToAltitude({ zoomLevel: 12, latitude: 0, tilt: 60 });
    close(tilted, flat * 0.5);
});

test('altitude and zoom are clamped to the shared core limits', () => {
    const converter = new ZoomAltitudeConverter();
    assert.equal(converter.zoomLevelToAltitude({ zoomLevel: 0, latitude: 0, tilt: 0 }), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
    assert.equal(converter.zoomLevelToAltitude({ zoomLevel: 22, latitude: 0, tilt: 0 }), AbstractZoomAltitudeConverter.MIN_ALTITUDE);
    assert.equal(converter.altitudeToZoomLevel({ altitude: 1, latitude: 0, tilt: 0 }),
        converter.altitudeToZoomLevel({ altitude: AbstractZoomAltitudeConverter.MIN_ALTITUDE, latitude: 0, tilt: 0 }));
    assert.equal(converter.distanceToZoomLevel({ distance: 1e12, latitude: 0 }),
        converter.distanceToZoomLevel({ distance: AbstractZoomAltitudeConverter.MAX_ALTITUDE, latitude: 0 }));
    // Latitudes beyond ±85 are treated as ±85.
    assert.equal(converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 89 }),
        converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 85 }));
});

test('with a full viewport the zoom-0 altitude follows the diagonal field of view', () => {
    const converter = new ZoomAltitudeConverter(undefined, () => ({ width: 1200, height: 500 }));
    const diagonal = Math.hypot(1200, 500);
    const expected = (AbstractZoomAltitudeConverter.WEB_MERCATOR_INITIAL_MPP_256 * diagonal)
        / (2 * Math.tan((55 / 2) * Math.PI / 180));
    close(converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 0 }), expected / 1024);
    // A wide viewport is not treated like a tall one of the same height.
    const tall = new ZoomAltitudeConverter(undefined, () => ({ width: 500, height: 500 }));
    assert.ok(converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 0 })
        > tall.zoomLevelToDistance({ zoomLevel: 10, latitude: 0 }));
});

test('height-only viewport scales the calibrated altitude by height / 720; invalid sizes fall back', () => {
    const z0 = ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE;
    const heightOnly = new ZoomAltitudeConverter(undefined, () => ({ width: 0, height: 1440 }));
    close(heightOnly.zoomLevelToDistance({ zoomLevel: 10, latitude: 0 }), (z0 * 2) / 1024);
    for (const size of [null, { width: NaN, height: NaN }, { width: 100, height: -1 }]) {
        const converter = new ZoomAltitudeConverter(undefined, () => size);
        close(converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 0 }), z0 / 1024, 1e-9, JSON.stringify(size));
    }
});

test('camera options: snapped zoom, WGS84 spatial reference, absolute tilt and native heading', () => {
    const converter = new ZoomAltitudeConverter();
    assert.equal(converter.mapCameraPositionToCameraOptions(null), null);

    const camera = createMapCameraPosition({
        position: createGeoPoint({ latitude: 21.3, longitude: -157.8 }),
        zoom: 9.5, bearing: 90, tilt: -30,
    });
    const options = converter.mapCameraPositionToCameraOptions(camera);
    // The eye sits behind the target (heading 270 → eye to the east) so the target is at the screen center.
    const snappedDistance0 = converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 21.3 });
    const eyeOffset = computeDistanceBetween(createGeoPoint({ latitude: 21.3, longitude: -157.8 }),
        createGeoPoint({ latitude: options.position.y, longitude: options.position.x }));
    close(eyeOffset, snappedDistance0 * Math.sin(Math.PI / 6), 1e-3);
    assert.ok(options.position.x > -157.8);
    assert.ok(Math.abs(options.position.y - 21.3) < 0.05);
    assert.deepEqual(options.position.spatialReference, { wkid: 4326 });
    assert.equal(options.tilt, 30);
    assert.equal(options.heading, 270);
    const snappedDistance = converter.zoomLevelToDistance({ zoomLevel: 10, latitude: 21.3 });
    close(options.position.z, snappedDistance * Math.cos(Math.PI / 6));

    // fitBounds keeps the fractional zoom.
    const unsnapped = converter.mapCameraPositionToCameraOptions(camera, { snapZoom: false });
    close(unsnapped.position.z, converter.zoomLevelToDistance({ zoomLevel: 9.5, latitude: 21.3 }) * Math.cos(Math.PI / 6));

    const steep = converter.mapCameraPositionToCameraOptions(
        createMapCameraPosition({ position: createGeoPoint({ latitude: 0, longitude: 0 }), zoom: 5, bearing: 0, tilt: 120 }),
    );
    assert.equal(steep.tilt, 90);
});

test('MapView scale: zoom 0 is the Web Mercator 256px world at 96 dpi and halves per level', () => {
    const zoom0 = (2 * Math.PI * 6378137) / 256 * 96 * 39.37;
    close(arcGISZoomToScale(0, 0), zoom0, 1e-6);
    close(arcGISZoomToScale(10, 0), zoom0 / 1024, 1e-6);
    // Latitude does not change the scale (no cos(lat) correction).
    assert.equal(arcGISZoomToScale(10, 70), arcGISZoomToScale(10, 0));
});

test('MapView scale snaps zoom to the nearest integer unless told not to', () => {
    assert.equal(arcGISZoomToScale(9.5, 0), arcGISZoomToScale(10, 0));
    assert.equal(arcGISZoomToScale(9.49, 0), arcGISZoomToScale(9, 0));
    close(arcGISZoomToScale(9.5, 0, false), arcGISZoomToScale(10, 0) * Math.SQRT2, 1e-9);
});

test('arcGISScaleToZoom inverts arcGISZoomToScale, fractional in between', () => {
    for (const z of [0, 3, 12, 20]) close(arcGISScaleToZoom(arcGISZoomToScale(z, 0), 45), z, 1e-9);
    close(arcGISScaleToZoom(arcGISZoomToScale(7.25, 0, false), 0), 7.25, 1e-9);
});
