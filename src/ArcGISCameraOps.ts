import {
  createGeoPoint,
  createGeoRectBounds,
  createMapCameraPosition,
  type MapCameraPosition,
  MapPaddings,
  type VisibleRegion, bearingFromNativeHeading, computeOffset, toNativeRotation, bearingFromNativeRotation, } from '@mapconductor/js-sdk-core';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import type { ArcGISViewHolder } from './ArcGISViewHolder';
import { arcGISScaleToZoom, arcGISZoomToScale } from './ArcGISMapViewController';
import { restoreLogicalCamera, shiftedCamera } from './ArcGIS2DTiltEmulation';
import type Extent from "@arcgis/core/geometry/Extent";
import type SceneView from "@arcgis/core/views/SceneView";

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
  /**
   * 2D で直近に要求した論理 tilt。2D `MapView` はカメラピッチを持てないため、
   * 負 tilt は中心の前進で表現している（{@link shiftedCamera}）。読み戻しで元の位置・
   * ズーム・負 tilt へ戻すためのヒントとして使う。
   */
  readonly logicalTilt?: () => number;
  /** 論理 tilt を記録する（`applyCamera` から呼ぶ）。 */
  readonly setLogicalTilt?: (tilt: number) => void;
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
  applyPaddings(deps, position);
  if (deps.holder.map.type === '2d') {
    deps.setLogicalTilt?.(position.tilt);
    // 2D はカメラピッチを持てない。負 tilt は地上ターゲットを進行方向へ前進させて表現し、
    // 見た目の傾きは `ArcGISMapView` の CSS `rotateX` が担当する。
    const shifted = shiftedCamera(position.position, position.zoom, position.bearing, position.tilt);
    const goToOptions = animated ? { duration: duration ?? 1000 } : { animate: false };
    return deps.holder.map.goTo({
      center: [shifted.center.longitude, shifted.center.latitude],
      scale: arcGISZoomToScale(shifted.zoom, shifted.center.latitude, snapZoom),
      rotation: toNativeRotation(position.bearing),
    }, goToOptions).then(() => true).catch(() => false);
  }
  const cameraOptions = deps.holder.zoomConverter.mapCameraPositionToCameraOptions(position, { snapZoom });
  if (!cameraOptions) return Promise.resolve(false);

  const goToOptions = animated ? { duration: duration ?? 1000, speedFactor: 1 } : { animate: false };
  return deps.holder.map.goTo(cameraOptions, goToOptions).then(() => true).catch(reportGoToFailure);
}

/**
 * `goTo` rejects for two very different reasons and only one of them is normal:
 * a newer `goTo` (or a user gesture) cancels the running animation, which ArcGIS
 * reports as a `view:goto-interrupted` AbortError. Everything else is a real
 * failure, and swallowing it silently is what let a malformed camera target
 * (a `position` with no `spatialReference`) leave the SceneView motionless with
 * nothing in the console. Keep returning `false` either way — callers only ask
 * "did the camera reach the target" — but say so for the non-interrupt case.
 */
function reportGoToFailure(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  if (name !== 'AbortError' && name !== 'view:goto-interrupted') {
    console.warn('[mapconductor] ArcGIS goTo failed; camera did not move.', error);
  }
  return false;
}

export function readCameraPosition(deps: CameraDeps): MapCameraPosition | null {
  if (deps.holder.map.type === '2d') {
    const view = deps.holder.map;
    const center = view.center;
    if (!center) return null;
    const logicalTilt = deps.logicalTilt?.() ?? 0;
    // 負 tilt で前進させた中心とズームを巻き戻し、論理 tilt をそのまま返す。
    const restored = restoreLogicalCamera(
      createGeoPoint({
        latitude: center.latitude ?? center.y,
        longitude: center.longitude ?? center.x,
      }),
      arcGISScaleToZoom(view.scale, center.latitude ?? center.y),
      view.rotation,
      logicalTilt,
    );
    return createMapCameraPosition({
      position: createGeoPoint({
        latitude: restored.position.latitude,
        longitude: restored.position.longitude,
      }),
      zoom: restored.zoom,
      bearing: bearingFromNativeRotation(view.rotation),
      tilt: logicalTilt,
      paddings: deps.holder.cameraPaddings ?? MapPaddings.Zeros,
      // 2D の tilt は描画面を CSS で潰して見せているだけで、遠近は無い。
      fov: 0,
      visibleRegion: readVisibleRegion(deps),
    });
  }
  const camera = (deps.holder.map as SceneView).camera;
  if (!camera) return null;

  const eye = createGeoPoint({
    latitude: camera.position.latitude ?? camera.position.y ?? 0,
    longitude: camera.position.longitude ?? camera.position.x ?? 0,
  });
  const altitude = camera.position.z ?? 0;
  const tilt = camera.tilt ?? 0;
  // camera.position は目の位置。MapConductor の position は画面中央に見ている
  // 地点なので、目から視線方向へ altitude·tan(tilt) 進めた地点を返す
  // （ZoomAltitudeConverter.mapCameraPositionToCameraOptions の逆）。
  const target = tilt > 0 && tilt < 90
    ? computeOffset({ origin: eye, distance: altitude * Math.tan((tilt * Math.PI) / 180), heading: camera.heading ?? 0 })
    : eye;

  const zoom = deps.holder.zoomConverter.altitudeToZoomLevel({
    altitude,
    latitude: target.latitude,
    tilt,
  });

  return createMapCameraPosition({
    position: createGeoPoint({
      latitude: target.latitude,
      longitude: target.longitude,
    }),
    zoom,
    bearing: bearingFromNativeHeading(camera.heading ?? 0),
    tilt,
    paddings: deps.holder.cameraPaddings ?? MapPaddings.Zeros,
    fov: verticalFov(camera.fov, deps.holder.map.width, deps.holder.map.height),
    visibleRegion: readVisibleRegion(deps),
  });
}

/**
 * `MapCameraPosition.paddings` を ArcGIS の `View.padding` へ。ArcGIS はパディングを
 * 除いた領域の中央を view の中心にする（3D は遠近込み）。2D で傾けているときは
 * 描画面を CSS で縦に cos(tilt) 倍へ潰して見せているので、描画面の上では上下の
 * パディングを 1 / cos(tilt) 倍にする。null は「今のパディングを変えない」。
 */
function applyPaddings(deps: CameraDeps, position: MapCameraPosition): void {
  const paddings = position.paddings ?? deps.holder.cameraPaddings;
  deps.holder.cameraPaddings = paddings;
  if (!paddings) return;
  const verticalScale = deps.holder.map.type === '2d'
    ? 1 / Math.max(Math.cos((Math.min(60, Math.abs(position.tilt)) * Math.PI) / 180), 0.01)
    : 1;
  deps.holder.map.padding = {
    top: paddings.top * verticalScale,
    bottom: paddings.bottom * verticalScale,
    left: paddings.left,
    right: paddings.right,
  };
}

/** SceneView の `camera.fov` は対角の視野角。上下の視野角（度）へ直す。 */
function verticalFov(diagonalFov: number | undefined, width: number, height: number): number | null {
  if (diagonalFov == null || !(width > 0) || !(height > 0)) return null;
  const half = (diagonalFov * Math.PI) / 360;
  return (2 * Math.atan((Math.tan(half) * height) / Math.hypot(width, height)) * 180) / Math.PI;
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
    ? (webMercatorUtils.webMercatorToGeographic(rawExtent) as Extent)
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
