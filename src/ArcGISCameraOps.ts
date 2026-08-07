import {
  createGeoPoint,
  createGeoRectBounds,
  createMapCameraPosition,
  type MapCameraPosition,
  type VisibleRegion,
} from '@mapconductor/js-sdk-core';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import type { ArcGISViewHolder } from './ArcGISViewHolder';
import { arcGISScaleToZoom, arcGISZoomToScale } from './ArcGISMapViewController';

/**
 * カメラの読み書き。
 *
 * ArcGIS の SceneView は「カメラ位置＋視点距離」で、MapView は「中心＋scale」。
 * どちらも MapConductor の論理ズーム（Google 基準）とは表現が違うので、
 * ここで往復させる。可視領域は `getBounds()` のような軸平行の矩形ではなく、
 * 画面 4 隅を投影し直して作る（回転していても正しくなるように）。
 */
export interface CameraDeps {
  readonly holder: ArcGISViewHolder;
}

/**
 * Shared camera commit. `snapZoom` defaults to true so explicit camera targets
 * quantize their zoom to match the Google Maps 2D reference; fitBounds passes
 * false to keep its fractional fit zoom so `padding` is honored.
 */
export function applyCamera(
  deps: CameraDeps,
  position: MapCameraPosition,
  { animated, duration, snapZoom = true }: { animated: boolean; duration?: number; snapZoom?: boolean },
): Promise<boolean> {
  if (deps.holder.map.type === '2d') {
    const goToOptions = animated ? { duration: duration ?? 1000 } : { animate: false };
    return deps.holder.map.goTo({
      center: [position.position.longitude, position.position.latitude],
      scale: arcGISZoomToScale(position.zoom, position.position.latitude, snapZoom),
      rotation: position.bearing,
    }, goToOptions).then(() => true).catch(() => false);
  }
  const cameraOptions = deps.holder.zoomConverter.mapCameraPositionToCameraOptions(position, { snapZoom });
  if (!cameraOptions) return Promise.resolve(false);

  const goToOptions = animated ? { duration: duration ?? 1000, speedFactor: 1 } : { animate: false };
  return deps.holder.map.goTo(cameraOptions, goToOptions).then(() => true).catch(() => false);
}

export function readCameraPosition(deps: CameraDeps): MapCameraPosition | null {
  if (deps.holder.map.type === '2d') {
    const view = deps.holder.map;
    const center = view.center;
    if (!center) return null;
    return createMapCameraPosition({
      position: createGeoPoint({
        latitude: center.latitude ?? center.y,
        longitude: center.longitude ?? center.x,
      }),
      zoom: arcGISScaleToZoom(view.scale, center.latitude ?? center.y),
      bearing: view.rotation,
      tilt: 0,
      visibleRegion: readVisibleRegion(deps),
    });
  }
  const camera = (deps.holder.map as __esri.SceneView).camera;
  if (!camera) return null;

  const latitude = camera.position.latitude ?? camera.position.y ?? 0;
  const longitude = camera.position.longitude ?? camera.position.x ?? 0;

  const zoom = deps.holder.zoomConverter.altitudeToZoomLevel({
    altitude: camera.position.z ?? 0,
    latitude,
    tilt: camera.tilt ?? 0,
  });

  return createMapCameraPosition({
    position: createGeoPoint({
      latitude,
      longitude,
      altitude: camera.position.z ?? undefined,
    }),
    zoom,
    bearing: camera.heading ?? 0,
    tilt: camera.tilt ?? 0,
    visibleRegion: readVisibleRegion(deps),
  });
}

export function readVisibleRegion(deps: CameraDeps): VisibleRegion | null {
  const rawExtent = deps.holder.map.extent;
  if (!rawExtent) return null;
  // view.extent is expressed in the view's own spatial reference (Web
  // Mercator, wkid 102100, for every basemap this SDK uses) — its
  // xmin/ymin/xmax/ymax are meters, not WGS84 degrees. Reproject before
  // treating them as latitude/longitude, or every downstream consumer of
  // visibleRegion.bounds (e.g. marker clustering's viewport filter) sees
  // bogus coordinates and treats the whole map as out of view.
  const extent = rawExtent.spatialReference?.isWebMercator
    ? (webMercatorUtils.webMercatorToGeographic(rawExtent) as __esri.Extent)
    : rawExtent;
  if (!extent) return null;

  const bounds = createGeoRectBounds();
  bounds.extend(createGeoPoint({
    latitude: extent.ymin,
    longitude: extent.xmin,
  }));
  bounds.extend(createGeoPoint({
    latitude: extent.ymax,
    longitude: extent.xmax,
  }));

  return {
    bounds,
    nearLeft: createGeoPoint({
      latitude: extent.ymin,
      longitude: extent.xmin,
    }),
    nearRight: createGeoPoint({
      latitude: extent.ymin,
      longitude: extent.xmax,
    }),
    farLeft: createGeoPoint({
      latitude: extent.ymax,
      longitude: extent.xmin,
    }),
    farRight: createGeoPoint({
      latitude: extent.ymax,
      longitude: extent.xmax,
    }),
  };
}
