[English](./README.md) | 日本語 | [Español (Latinoamérica)](./README.es-419.md)

# @mapconductor/react-for-arcgis

MapConductor React SDK の ArcGIS Maps SDK for JavaScript プロバイダです。MapConductor のプロバイダ非依存なカメラ・マーカー・オーバーレイ API を通じて ArcGIS の `MapView`(2D)または `SceneView`(3D)を描画するため、同じアプリケーションコードが Google Maps、MapLibre、Mapbox、Leaflet、OpenLayers、Cesium、HERE でもそのまま動作します。

## インストール

```shell
npm install @mapconductor/react-for-arcgis
```

`@mapconductor/js-sdk-core` と `@mapconductor/js-sdk-react`(マーカーなどの共有コンポーネントで使用)は依存関係として自動的にインストールされます。ただしアプリケーションコードはこの2つから直接 import するため、pnpm の strict(isolated)な `node_modules` を使う場合や、import するものをすべて明示的に宣言したい場合は、次のように明示的にインストールしてください:

```shell
npm install @mapconductor/react-for-arcgis @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

`@arcgis/core` は依存関係として同梱されています。Esri のベースマップには [ArcGIS Location Platform](https://location.arcgis.com/) の API キーが必要です。OSM ベースのデザインはキーなしで動作します。

## クイックスタート

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

同じカメラセマンティクスのまま 3D の `SceneView` を描画するには、`ArcGISMapView2D` の代わりに `ArcGISMapView` を使用します。

## マップデザイン

`ArcGISDesign` は `Streets`、`Imagery`、`ImageryStandard`、`ImageryLabels`、`LightGray`、`DarkGray`、`OsmStandard` などのベースマッププリセットを提供します。実行時に切り替えるには `state.mapDesignType = ...` を代入します。

## 関連パッケージ

- [`@mapconductor/js-sdk-core`](../js-sdk-core) — ジオメトリ・カメラ・状態のプリミティブ
- [`@mapconductor/js-sdk-react`](../js-sdk-react) — 共有の `Marker`・`Markers`・シェイプ・インフォバブル
