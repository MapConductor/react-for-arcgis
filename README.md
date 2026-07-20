# @mapconductor/react-for-arcgis

ArcGIS Maps SDK for JavaScript provider for the MapConductor React SDK. Renders
an ArcGIS `MapView` (2D) or `SceneView` (3D) through MapConductor's
provider-independent camera, marker, and overlay API, so the same application
code can also run on Google Maps, MapLibre, Mapbox, Leaflet, OpenLayers,
Cesium, or HERE.

## Installation

```shell
npm install @mapconductor/react-for-arcgis
```

`@mapconductor/js-sdk-core` and `@mapconductor/js-sdk-react` (used for markers and
other shared components) are installed automatically as dependencies. Your
code imports from both directly, so with pnpm's strict (isolated)
`node_modules` — or whenever you prefer to declare everything you import —
install them explicitly instead:

```shell
npm install @mapconductor/react-for-arcgis @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

`@arcgis/core` is bundled as a dependency. Esri basemaps require an API key
from the [ArcGIS Location Platform](https://location.arcgis.com/); the
OSM-based designs work without one.

## Quick start

```tsx
import { createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';
import { Marker } from '@mapconductor/js-sdk-react';
import {
  ArcGISDesign,
  ArcGISMapView2D,
  useArcGISViewState,
} from '@mapconductor/react-for-arcgis';

const TOKYO = createGeoPoint({ latitude: 35.6812, longitude: 139.7671 });

export function App() {
  const state = useArcGISViewState({
    apiKey: import.meta.env.VITE_ARCGIS_API_KEY,
    mapDesignType: ArcGISDesign.Streets,
    cameraPosition: createMapCameraPosition({ position: TOKYO, zoom: 12 }),
  });

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ArcGISMapView2D
        state={state}
        onMapClick={point => console.log('clicked', point.latitude, point.longitude)}
        onCameraMoveEnd={camera => console.log('zoom', camera.zoom)}
      >
        <Marker position={TOKYO} />
      </ArcGISMapView2D>
    </div>
  );
}
```

Use `ArcGISMapView` instead of `ArcGISMapView2D` to render a 3D `SceneView`
with the same camera semantics.

## Map designs

`ArcGISDesign` ships basemap presets including `Streets`, `Imagery`,
`ImageryStandard`, `ImageryLabels`, `LightGray`, `DarkGray`, and
`OsmStandard`. Switch at runtime by assigning `state.mapDesignType = ...`.

## Related packages

- [`@mapconductor/js-sdk-core`](../js-sdk-core) — geometry, camera, and state primitives
- [`@mapconductor/js-sdk-react`](../js-sdk-react) — shared `Marker`, `Markers`, shapes, and info bubbles
