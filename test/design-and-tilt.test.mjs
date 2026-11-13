import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeDistanceBetween, createGeoPoint } from '@mapconductor/js-sdk-core';
import { buildSources } from './support/buildSources.mjs';

// ArcGISDesign の id -> basemap style 名の変換と、2D MapView の tilt 擬似表現
// （負 tilt は中心を bearing 方向へ前進させ、読み戻しで巻き戻す）を確かめる。
const { design, tilt } = await buildSources('design-tilt-tests', {
    design: 'src/ArcGISMapDesign.ts',
    tilt: 'src/ArcGIS2DTiltEmulation.ts',
});
const { ArcGISDesign } = design;
const { shiftedCamera, restoreLogicalCamera, markerVerticalStretch, visualTiltDegrees } = tilt;

test('toBasemapStyle maps design ids to ArcGIS basemap style names', () => {
    const cases = [
        [ArcGISDesign.Streets, 'arcgis/streets'],
        [ArcGISDesign.Imagery, 'arcgis/imagery'],
        [ArcGISDesign.ImageryStandard, 'arcgis/imagery/standard'],
        [ArcGISDesign.ImageryLabels, 'arcgis/imagery/labels'],
        [ArcGISDesign.LightGrayBase, 'arcgis/light-gray/base'],
        [ArcGISDesign.TerrainDetail, 'arcgis/terrain/detail'],
        [ArcGISDesign.HumanGeographyDarkLabels, 'arcgis/human-geography-dark/labels'],
        [ArcGISDesign.HillshadeDark, 'arcgis/hillshade/dark'],
        [ArcGISDesign.OsmStandard, 'osm/standard'],
        [ArcGISDesign.OsmStandardReliefBase, 'osm/standard-relief/base'],
        [ArcGISDesign.OsmHybridDetail, 'osm/hybrid/detail'],
    ];
    for (const [d, expected] of cases) assert.equal(ArcGISDesign.toBasemapStyle(d), expected, d.id);
});

test('Create returns the registered singleton, or a copy carrying elevation sources', () => {
    assert.equal(ArcGISDesign.Create('arc_gis_topographic'), ArcGISDesign.Topographic);
    assert.equal(ArcGISDesign.Create('none'), ArcGISDesign.None);
    const withElevation = ArcGISDesign.Create('arc_gis_imagery', ['https://elevation.example/ImageServer']);
    assert.notEqual(withElevation, ArcGISDesign.Imagery);
    assert.equal(withElevation.getValue(), 'arc_gis_imagery');
    assert.deepEqual(withElevation.elevationSources, ['https://elevation.example/ImageServer']);
    assert.deepEqual(ArcGISDesign.Imagery.elevationSources, []);
    assert.throws(() => ArcGISDesign.Create('nope'), /unknown design id: "nope"/);
    assert.throws(() => ArcGISDesign.toBasemapStyle({ getValue: () => 'nope' }), /unknown design id/);
});

test('every registered design has a unique id', () => {
    const designs = Object.values(ArcGISDesign).filter((v) => v instanceof ArcGISDesign);
    const ids = designs.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.equal(ArcGISDesign.Create(id).id, id);
});

const tokyo = createGeoPoint({ latitude: 35.68, longitude: 139.76 });

test('tilt >= 0 leaves the requested center and zoom untouched', () => {
    for (const t of [0, 30, 60]) {
        const shifted = shiftedCamera(tokyo, 12, 45, t);
        assert.equal(shifted.center, tokyo);
        assert.equal(shifted.zoom, 12);
        const restored = restoreLogicalCamera(tokyo, 12, 45, t);
        assert.equal(restored.position, tokyo);
        assert.equal(restored.zoom, 12);
    }
});

test('negative tilt moves the center ahead along the bearing and zooms out up to 0.9', () => {
    const north = shiftedCamera(tokyo, 12, 0, -60);
    assert.ok(north.center.latitude > tokyo.latitude);
    assert.ok(Math.abs(north.center.longitude - tokyo.longitude) < 1e-9);
    assert.ok(Math.abs(north.zoom - 11.1) < 1e-12);

    const half = shiftedCamera(tokyo, 12, 0, -30);
    assert.ok(Math.abs(half.zoom - 11.55) < 1e-12);

    // MapConductor bearing turns the map clockwise: at 90 the top of the screen is
    // west, so the camera looks (and the target moves) west.
    const west = shiftedCamera(tokyo, 12, 90, -45);
    assert.ok(west.center.longitude < tokyo.longitude);
    assert.ok(Math.abs(west.center.latitude - tokyo.latitude) < 1e-2);

    // Steeper tilts move further; beyond 60 is clamped to 60.
    const d = (t) => computeDistanceBetween(tokyo, shiftedCamera(tokyo, 12, 0, t).center);
    assert.ok(d(-20) < d(-40));
    assert.ok(d(-40) < d(-60));
    assert.ok(Math.abs(d(-80) - d(-60)) < 1e-6);
    assert.equal(shiftedCamera(tokyo, 12, 0, -80).zoom, north.zoom);
});

// The inverse recomputes the shift distance at the shifted latitude (it does not know the
// original one), so the position comes back to within a few percent of the shift (the cos(latitude)
// difference between the two latitudes), and the zoom exactly.
test('restoreLogicalCamera undoes shiftedCamera for negative tilts', () => {
    for (const [bearing, t, z] of [[0, -60, 12], [135, -25, 8], [270, -45, 16.5]]) {
        const shifted = shiftedCamera(tokyo, z, bearing, t);
        const shift = computeDistanceBetween(shifted.center, tokyo);
        const restored = restoreLogicalCamera(shifted.center, shifted.zoom, bearing, t);
        assert.ok(Math.abs(restored.zoom - z) < 1e-9, `zoom ${restored.zoom} vs ${z}`);
        assert.ok(computeDistanceBetween(restored.position, tokyo) < shift * 0.05, `bearing ${bearing} tilt ${t}`);
    }
});

test('marker vertical stretch is 1/cos(tilt), capped at 2 by the 60 degree clamp', () => {
    assert.equal(markerVerticalStretch(0), 1);
    assert.ok(Math.abs(markerVerticalStretch(60) - 2) < 1e-12);
    assert.ok(Math.abs(markerVerticalStretch(-45) - Math.SQRT2) < 1e-12);
    assert.ok(Math.abs(markerVerticalStretch(85) - 2) < 1e-12);
    assert.equal(visualTiltDegrees(-30), 30);
    assert.equal(visualTiltDegrees(75), 60);
});
