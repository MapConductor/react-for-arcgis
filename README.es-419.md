[English](./README.md) | [日本語](./README.ja.md) | Español (Latinoamérica)

# @mapconductor/react-for-arcgis

Proveedor de ArcGIS Maps SDK for JavaScript para el SDK de React de MapConductor. Renderiza un `MapView` (2D) o `SceneView` (3D) de ArcGIS a través de la API de cámara, marcadores y superposiciones independiente del proveedor de MapConductor, de modo que el mismo código de aplicación también puede ejecutarse en Google Maps, MapLibre, Mapbox, Leaflet, OpenLayers, Cesium o HERE.

## Instalación

```shell
npm install @mapconductor/react-for-arcgis
```

`@mapconductor/js-sdk-core` y `@mapconductor/js-sdk-react` (usados para marcadores y otros componentes compartidos) se instalan automáticamente como dependencias. Tu código importa directamente de ambos, así que con el `node_modules` estricto (aislado) de pnpm — o siempre que prefieras declarar todo lo que importas — instálalos explícitamente:

```shell
npm install @mapconductor/react-for-arcgis @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

`@arcgis/core` viene incluido como dependencia. Los mapas base de Esri requieren una clave de API de [ArcGIS Location Platform](https://location.arcgis.com/); los diseños basados en OSM funcionan sin ella.

## Inicio rápido

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

Usa `ArcGISMapView` en lugar de `ArcGISMapView2D` para renderizar un `SceneView` 3D con la misma semántica de cámara.

## Diseños de mapa

`ArcGISDesign` incluye presets de mapas base como `Streets`, `Imagery`, `ImageryStandard`, `ImageryLabels`, `LightGray`, `DarkGray` y `OsmStandard`. Cambia en tiempo de ejecución asignando `state.mapDesignType = ...`.

## Paquetes relacionados

- [`@mapconductor/js-sdk-core`](../js-sdk-core) — primitivas de geometría, cámara y estado
- [`@mapconductor/js-sdk-react`](../js-sdk-react) — `Marker`, `Markers`, formas y burbujas de información compartidos
