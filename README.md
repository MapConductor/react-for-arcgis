English | [日本語](https://github.com/MapConductor/react-for-arcgis/blob/main/README.ja.md) | [Español (Latinoamérica)](https://github.com/MapConductor/react-for-arcgis/blob/main/README.es-419.md)

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

Pass the key to `useArcGISViewState`:

```tsx
// Your own key. Read it from your environment however your build tool does
// it, and keep it out of source control.
const ARCGIS_API_KEY = '…';

const mapViewState = useArcGISViewState({
  apiKey: ARCGIS_API_KEY,
  mapDesignType: ArcGISDesign.Streets,
  cameraPosition: INITIAL_CAMERA,
});
```

Leave `apiKey` out and only the OSM-based designs will draw; the Esri ones
report `ArcGIS API key is required`.

![](https://raw.githubusercontent.com/mapconductor/react-for-arcgis/docs/images/hello-map.jpg)

## Hello Map tutorial

The simplest possible map app, built with MapConductor + ArcGIS: click the
marker and a "Hello, MapConductor" bubble pops up. You can build it in the 5
steps below. It uses the OSM Standard basemap, which needs no API key, so you
can copy-paste and it just works.

### Step 1: Create a React project

Create a React + TypeScript project with Vite.

```shell
npm create vite@latest hello-map -- --template react-ts
cd hello-map
npm install
npm run dev
```

### Step 2: Install MapConductor (ArcGIS)

Install the package needed to show a map. We use ArcGIS here, but you can use
other map modules too.

```shell
npm install @mapconductor/react-for-arcgis
```

- `@mapconductor/react-for-arcgis` — components / hooks for ArcGIS
- `@mapconductor/js-sdk-react` / `@mapconductor/js-sdk-core` are installed
  automatically as dependencies.

### Step 3: Show the map

Create the map state with `useArcGISViewState` and render it with
`<ArcGISMapView2D>`. Give the outer element a height to make it full-screen.

```tsx
import {
  ArcGISDesign,
  ArcGISMapView2D,
  useArcGISViewState,
} from '@mapconductor/react-for-arcgis';
import { createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';

const TOKYO = createGeoPoint({ latitude: 35.6812, longitude: 139.7671 });
const INITIAL_CAMERA = createMapCameraPosition({ position: TOKYO, zoom: 14 });

export default function App() {
  const mapViewState = useArcGISViewState({
    mapDesignType: ArcGISDesign.OsmStandard,
    cameraPosition: INITIAL_CAMERA,
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ArcGISMapView2D state={mapViewState} />
    </div>
  );
}
```

Use `ArcGISMapView` instead of `ArcGISMapView2D` to render a 3D `SceneView`
with the same camera semantics.

### Step 4: Place a marker

Create the marker state with `createMarkerState` and register it with
`<Marker>`. Write overlays as **child elements** of the map component.

```tsx
import { useMemo } from 'react';
import { createMarkerState } from '@mapconductor/js-sdk-core';
import { Marker } from '@mapconductor/js-sdk-react';

// ...inside App...
const marker = useMemo(
  () => createMarkerState({ id: 'hello', position: TOKYO }),
  [],
);

// ...inside return...
<ArcGISMapView2D state={mapViewState}>
  <Marker state={marker} />
</ArcGISMapView2D>
```

### Step 5: Show an InfoBubble on click

Track the selected state with `useState`, set it to true in the marker's
`onClick`, and render `<InfoBubble>` only while selected. This is the finished
app.

```tsx
import { useMemo, useState } from 'react';
import {
  ArcGISDesign,
  ArcGISMapView2D,
  useArcGISViewState,
} from '@mapconductor/react-for-arcgis';
import {
  createGeoPoint,
  createMapCameraPosition,
  createMarkerState,
} from '@mapconductor/js-sdk-core';
import { InfoBubble, Marker } from '@mapconductor/js-sdk-react';

const TOKYO = createGeoPoint({ latitude: 35.6812, longitude: 139.7671 });
const INITIAL_CAMERA = createMapCameraPosition({ position: TOKYO, zoom: 14 });

export default function App() {
  const mapViewState = useArcGISViewState({
    mapDesignType: ArcGISDesign.OsmStandard,
    cameraPosition: INITIAL_CAMERA,
  });

  const [selected, setSelected] = useState(false);

  const marker = useMemo(
    () => createMarkerState({
      id: 'hello',
      position: TOKYO,
      onClick: () => setSelected(true),
    }),
    [],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ArcGISMapView2D state={mapViewState} onMapClick={() => setSelected(false)}>
        <Marker state={marker} />
        {selected && (
          <InfoBubble marker={marker}>
            <div style={{ padding: '8px 12px', fontWeight: 600 }}>
              Hello, MapConductor
            </div>
          </InfoBubble>
        )}
      </ArcGISMapView2D>
    </div>
  );
}
```

### Key points

- Coordinates, cameras and markers are created with `js-sdk-core` functions
  (**provider-independent**).
- The map component and hooks come from `react-for-arcgis`
  (**provider-specific**).
- Write overlays as **child elements** of the map component.
- Control show / hide with React `useState`.

## Related packages

- [`@mapconductor/js-sdk-core`](https://github.com/mapconductor/js-sdk-core) — geometry, camera, and state primitives
- [`@mapconductor/js-sdk-react`](https://github.com/mapconductor/js-sdk-react) — shared `Marker`, `Markers`, shapes, and info bubbles
