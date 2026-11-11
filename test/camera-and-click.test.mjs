import assert from 'node:assert/strict';
import { test } from 'node:test';
import Extent from '@arcgis/core/geometry/Extent.js';
import { computeDistanceBetween, createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';
import { buildSources } from './support/buildSources.mjs';

// カメラの読み書き（ArcGISCameraOps）とクリック配送（ArcGISClickHandlers）を、
// MapView / SceneView の代わりの小さな偽物で動かす。
// - 2D: goTo に center / scale / rotation を渡す。負 tilt は中心を前進させ、読み戻しで巻き戻す。
// - 3D: ZoomAltitudeConverter が作る camera を goTo に渡す。中断（AbortError）は黙って false、
//   それ以外の失敗は warn してから false。
// - 可視領域: view.extent が Web Mercator なら度に戻してから 4 隅を作る。
// - クリック: マーカーは画面座標で当て、他は画面 -> 地理座標にしてから各コントローラで探す。
const { camera, click, zoom, controller } = await buildSources('camera-click-tests', {
    camera: 'src/ArcGISCameraOps.ts',
    click: 'src/ArcGISClickHandlers.ts',
    zoom: 'src/zoom/ZoomAltitudeConverter.ts',
    controller: 'src/ArcGISMapViewController.ts',
});
const { applyCamera, readCameraPosition, readVisibleRegion } = camera;
const { arcGISZoomToScale } = controller;

const pt = (latitude, longitude) => createGeoPoint({ latitude, longitude });
const cam = (latitude, longitude, zoomLevel, bearing = 0, tilt = 0) =>
    createMapCameraPosition({ position: pt(latitude, longitude), zoom: zoomLevel, bearing, tilt });

function fakeView(type, overrides = {}) {
    const calls = [];
    return {
        type,
        calls,
        goToResult: Promise.resolve(),
        goTo(target, options) { calls.push({ target, options }); return this.goToResult; },
        ...overrides,
    };
}

function deps(view) {
    let logicalTilt = 0;
    return {
        holder: { map: view, zoomConverter: new zoom.ZoomAltitudeConverter() },
        logicalTilt: () => logicalTilt,
        setLogicalTilt: (t) => { logicalTilt = t; },
    };
}

test('2D applyCamera: center, snapped scale and rotation; animation options', async () => {
    const view = fakeView('2d');
    const d = deps(view);
    assert.equal(await applyCamera(d, cam(35, 139, 9.5, 30, 20), { animated: false }), true);
    const [{ target, options }] = view.calls;
    assert.deepEqual(target.center, [139, 35]);
    assert.equal(target.scale, arcGISZoomToScale(10, 35));
    assert.equal(target.rotation, 30);
    assert.deepEqual(options, { animate: false });
    assert.equal(d.logicalTilt(), 20);

    await applyCamera(d, cam(35, 139, 9.5), { animated: true, snapZoom: false });
    assert.equal(view.calls[1].target.scale, arcGISZoomToScale(9.5, 35, false));
    assert.deepEqual(view.calls[1].options, { duration: 1000 });
    await applyCamera(d, cam(35, 139, 9), { animated: true, duration: 250 });
    assert.deepEqual(view.calls[2].options, { duration: 250 });
});

test('2D applyCamera: a negative tilt moves the center ahead and zooms out', async () => {
    const view = fakeView('2d');
    await applyCamera(deps(view), cam(35, 139, 12, 0, -60), { animated: false, snapZoom: false });
    const { target } = view.calls[0];
    assert.ok(target.center[1] > 35);
    assert.equal(target.scale, arcGISZoomToScale(11.1, 0, false));
});

test('2D applyCamera reports false when goTo rejects', async () => {
    const view = fakeView('2d');
    view.goToResult = Promise.reject(new Error('boom'));
    assert.equal(await applyCamera(deps(view), cam(0, 0, 3), { animated: false }), false);
});

test('3D applyCamera: passes the converter camera; interrupts are silent, other failures warn', async () => {
    const view = fakeView('3d');
    const d = deps(view);
    assert.equal(await applyCamera(d, cam(21.3, -157.8, 9.5, 90, 30), { animated: true }), true);
    const [{ target, options }] = view.calls;
    assert.deepEqual(target, d.holder.zoomConverter.mapCameraPositionToCameraOptions(cam(21.3, -157.8, 9.5, 90, 30)));
    assert.deepEqual(options, { duration: 1000, speedFactor: 1 });

    const warnings = [];
    const { warn } = console;
    console.warn = (...args) => warnings.push(args);
    try {
        for (const name of ['AbortError', 'view:goto-interrupted']) {
            view.goToResult = Promise.reject(Object.assign(new Error(name), { name }));
            assert.equal(await applyCamera(d, cam(0, 0, 3), { animated: false }), false);
        }
        assert.equal(warnings.length, 0);
        view.goToResult = Promise.reject(new TypeError("Cannot read properties of null (reading 'spatialReference')"));
        assert.equal(await applyCamera(d, cam(0, 0, 3), { animated: false }), false);
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = warn;
    }
});

test('2D readCameraPosition reads center/scale/rotation and restores a negative logical tilt', async () => {
    const view = fakeView('2d', {
        center: { latitude: 35, longitude: 139 },
        scale: arcGISZoomToScale(12, 35),
        rotation: 45,
        extent: null,
    });
    const d = deps(view);
    const read = readCameraPosition(d);
    assert.equal(read.position.latitude, 35);
    assert.equal(read.position.longitude, 139);
    assert.ok(Math.abs(read.zoom - 12) < 1e-9);
    assert.equal(read.bearing, 45);
    assert.equal(read.tilt, 0);

    // Round trip through applyCamera with a negative tilt.
    const requested = cam(35, 139, 12, 0, -40);
    const writer = fakeView('2d');
    const wd = deps(writer);
    await applyCamera(wd, requested, { animated: false, snapZoom: false });
    const { target } = writer.calls[0];
    writer.center = { latitude: target.center[1], longitude: target.center[0] };
    writer.scale = target.scale;
    writer.rotation = target.rotation;
    writer.extent = null;
    const back = readCameraPosition(wd);
    assert.equal(back.tilt, -40);
    assert.ok(Math.abs(back.zoom - 12) < 1e-9);
    assert.ok(computeDistanceBetween(back.position, requested.position) < 1_000);
});

test('readCameraPosition falls back to x/y and returns null without a center or camera', () => {
    const d2 = deps(fakeView('2d', { center: { x: 10, y: 20 }, scale: arcGISZoomToScale(5, 0), rotation: 0, extent: null }));
    const read = readCameraPosition(d2);
    assert.deepEqual([read.position.latitude, read.position.longitude], [20, 10]);
    assert.equal(readCameraPosition(deps(fakeView('2d', { center: null }))), null);
    assert.equal(readCameraPosition(deps(fakeView('3d', { camera: null }))), null);
});

test('3D readCameraPosition converts altitude to zoom and native heading to bearing', () => {
    const converter = new zoom.ZoomAltitudeConverter();
    const altitude = converter.zoomLevelToAltitude({ zoomLevel: 11, latitude: 35, tilt: 30 });
    const view = fakeView('3d', {
        camera: { position: { latitude: 35, longitude: 139, z: altitude }, heading: 270, tilt: 30 },
        extent: null,
    });
    const read = readCameraPosition(deps(view));
    assert.ok(Math.abs(read.zoom - 11) < 1e-9);
    assert.equal(read.bearing, 90);
    assert.equal(read.tilt, 30);
    assert.equal(read.position.altitude, altitude);
});

test('visible region: a WGS84 extent is used as is, corners from min/max', () => {
    const view = fakeView('2d', { extent: { xmin: 130, ymin: 30, xmax: 140, ymax: 40, spatialReference: { wkid: 4326, isWebMercator: false } } });
    const region = readVisibleRegion(deps(view));
    assert.deepEqual([region.nearLeft.latitude, region.nearLeft.longitude], [30, 130]);
    assert.deepEqual([region.nearRight.latitude, region.nearRight.longitude], [30, 140]);
    assert.deepEqual([region.farLeft.latitude, region.farLeft.longitude], [40, 130]);
    assert.deepEqual([region.farRight.latitude, region.farRight.longitude], [40, 140]);
    assert.equal(region.bounds.southWest.latitude, 30);
    assert.equal(region.bounds.northEast.longitude, 140);
    assert.equal(readVisibleRegion(deps(fakeView('2d', { extent: null }))), null);
});

test('visible region: a Web Mercator extent is reprojected to degrees first', () => {
    const extent = new Extent({ xmin: 0, ymin: 0, xmax: 1_113_194.9079327357, ymax: 1_118_889.9748579594, spatialReference: { wkid: 102100 } });
    const region = readVisibleRegion(deps(fakeView('2d', { extent })));
    assert.ok(Math.abs(region.farRight.longitude - 10) < 1e-6);
    assert.ok(Math.abs(region.farRight.latitude - 10) < 1e-6);
    assert.ok(Math.abs(region.nearLeft.latitude) < 1e-9);
});

// ---- click handlers ----

function clickDeps({ marker = null, circle = null, polygon = null, polyline = null, groundImage = null, toMap = pt(1, 2) } = {}) {
    const dispatched = [];
    const finder = (kind, hit) => ({
        find: () => hit,
        findWithClosestPoint: () => hit,
        dispatchClick: (event) => dispatched.push([kind, event]),
    });
    return {
        dispatched,
        deps: {
            holder: { fromScreenOffsetSync: () => toMap },
            markerController: {
                findAtScreen: (screen, z) => { dispatched.push(['findAtScreen', screen, z]); return marker; },
                dispatchClick: (state) => dispatched.push(['marker', state]),
            },
            circleController: finder('circle', circle),
            polygonController: finder('polygon', polygon),
            polylineController: finder('polyline', polyline),
            groundImageController: finder('groundImage', groundImage),
            getCameraPosition: () => cam(0, 0, 7),
        },
    };
}

const event = { x: 10, y: 20 };

test('marker click hit-tests in screen space at the current zoom and honours clickable', async () => {
    const hit = clickDeps({ marker: { state: { id: 'm', clickable: true } } });
    assert.equal(await click.handleMarkerClick(hit.deps, event), true);
    assert.deepEqual(hit.dispatched, [['findAtScreen', { x: 10, y: 20 }, 7], ['marker', { id: 'm', clickable: true }]]);

    const notClickable = clickDeps({ marker: { state: { id: 'm', clickable: false } } });
    assert.equal(await click.handleMarkerClick(notClickable.deps, event), false);
    assert.equal(notClickable.dispatched.length, 1);

    const miss = clickDeps();
    assert.equal(await click.handleMarkerClick(miss.deps, event), false);
});

test('circle / polygon / ground image clicks dispatch the entity state with the clicked point', async () => {
    const clicked = pt(9, 9);
    for (const [kind, fn] of [['circle', click.handleCircleClick], ['polygon', click.handlePolygonClick], ['groundImage', click.handleGroundImageClick]]) {
        const hit = clickDeps({ [kind]: { state: { id: kind } } });
        assert.equal(await fn(hit.deps, event, clicked), true, kind);
        assert.deepEqual(hit.dispatched, [[kind, { state: { id: kind }, clicked }]]);

        const miss = clickDeps();
        assert.equal(await fn(miss.deps, event, clicked), false, kind);
        assert.equal(miss.dispatched.length, 0);

        const offMap = clickDeps({ [kind]: { state: { id: kind } }, toMap: null });
        assert.equal(await fn(offMap.deps, event, clicked), false, kind);
    }
});

test('polyline click reports the closest point on the line, not the raw click', async () => {
    const closestPoint = pt(3, 4);
    const hit = clickDeps({ polyline: { entity: { state: { id: 'l' } }, closestPoint } });
    assert.equal(await click.handlePolylineClick(hit.deps, event), true);
    assert.deepEqual(hit.dispatched, [['polyline', { state: { id: 'l' }, clicked: closestPoint }]]);
    assert.equal(await click.handlePolylineClick(clickDeps({ toMap: null }).deps, event), false);
});
