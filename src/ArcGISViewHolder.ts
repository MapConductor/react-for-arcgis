import {
  MapViewHolderBase,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
  type MapPaddings,
  type Offset,
} from '@mapconductor/js-sdk-core';
import { ZoomAltitudeConverter } from './zoom';
import Point from '@arcgis/core/geometry/Point';
import type MapView from "@arcgis/core/views/MapView";
import type SceneView from "@arcgis/core/views/SceneView";

export class ArcGISViewHolder extends MapViewHolderBase<HTMLElement, SceneView | MapView> {
  constructor(
    readonly mapView: HTMLElement,
    readonly map: SceneView | MapView,
    readonly zoomConverter: ZoomAltitudeConverter,
  ) {
    super();
  }

  /**
   * 2D の tilt 再現で `mapView`（ArcGIS の描画面）に掛けている `rotateX` の角度。
   * 傾けている間、描画面は外枠の 200% に広げてから縦に cos(tilt) 倍で潰して見せる
   * （ArcGISMapView.web.tsx）。0 なら描画面＝外枠。
   * @internal
   */
  planeTiltDegrees = 0;

  /**
   * 最後にカメラを動かしたときの `MapCameraPosition.paddings`（外枠の画素）。
   * ArcGIS の `View.padding` へは 2D の傾きぶんを直して渡すので、元の値はここに持つ。
   * @internal
   */
  cameraPaddings: MapPaddings | null = null;

  // 画面（外枠）上の位置。InfoBubble やアプリが重ねる要素はこの座標で置く。
  // 2D で傾けているときは描画面の座標を外枠へ写す（OpenLayers / HERE の
  // `mapPixelToViewport` と同じ、正射影の縦縮み）。
  toScreenOffset(position: GeoPointInterface): Offset | null {
    const plane = this.toPlaneScreenOffset(position);
    return plane ? planeToViewport(this.mapView, this.planeTiltDegrees, plane) : null;
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint | null {
    return this.fromPlaneScreenOffsetSync(viewportToPlane(this.mapView, this.planeTiltDegrees, offset));
  }

  /**
   * ArcGIS の描画面（傾ける前の平面）上の座標。ArcGIS のイベントが返す
   * `x` / `y` もこの座標なので、当たり判定はこちらで揃える。
   * @internal
   */
  toPlaneScreenOffset(position: GeoPointInterface): Offset | null {
    try {
      // Must be a real Point instance: SceneView.toScreen projects via the
      // point's x/y properties, which a plain {longitude, latitude} literal
      // lacks — the projection then yields NaN screen coordinates and
      // overlays (e.g. InfoBubble) fall back to the container's top-left.
      const point = new Point({
        longitude: position.longitude,
        latitude: position.latitude,
        spatialReference: { wkid: 4326 },
      });

      const screenPoint = this.map.toScreen(point);
      if (!screenPoint || !Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) return null;

      return {
        x: screenPoint.x,
        y: screenPoint.y,
      };
    } catch {
      return null;
    }
  }

  /**
   * {@link toPlaneScreenOffset} の逆。
   * @internal
   */
  fromPlaneScreenOffsetSync(offset: Offset): GeoPoint | null {
    try {
      const screenPoint = {
        x: offset.x,
        y: offset.y,
      };

      const point = this.map.toMap(screenPoint) as Point;
      if (!point) return null;

      return createGeoPoint({
        latitude: point.latitude ?? 0,
        longitude: point.longitude ?? 0,
        altitude: point.z ?? undefined,
      });
    } catch {
      return null;
    }
  }
}

function viewportSize(plane: HTMLElement): { width: number; height: number; planeWidth: number; planeHeight: number } {
  const planeWidth = plane.clientWidth;
  const planeHeight = plane.clientHeight;
  const outer = plane.parentElement;
  return {
    width: outer?.clientWidth || planeWidth,
    height: outer?.clientHeight || planeHeight,
    planeWidth,
    planeHeight,
  };
}

function planeToViewport(plane: HTMLElement, tiltDegrees: number, offset: Offset): Offset {
  if (!tiltDegrees) return offset;
  const { width, height, planeWidth, planeHeight } = viewportSize(plane);
  const scale = Math.cos((tiltDegrees * Math.PI) / 180);
  return {
    x: width / 2 + (offset.x - planeWidth / 2),
    y: height / 2 + (offset.y - planeHeight / 2) * scale,
  };
}

function viewportToPlane(plane: HTMLElement, tiltDegrees: number, offset: Offset): Offset {
  if (!tiltDegrees) return offset;
  const { width, height, planeWidth, planeHeight } = viewportSize(plane);
  const scale = Math.max(Math.cos((tiltDegrees * Math.PI) / 180), 0.01);
  return {
    x: planeWidth / 2 + (offset.x - width / 2),
    y: planeHeight / 2 + (offset.y - height / 2) / scale,
  };
}
