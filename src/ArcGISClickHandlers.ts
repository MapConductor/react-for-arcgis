import type {
  CircleEvent,
  GeoPoint,
  GroundImageEvent,
  MapCameraPosition,
  PolygonEvent,
  PolylineEvent,
} from '@mapconductor/js-sdk-core';
import type { ArcGISViewHolder } from './ArcGISViewHolder';
import type { ArcGISMarkerController } from './marker/ArcGISMarkerController';
import type { ArcGISCircleOverlayController } from './circle/ArcGISCircleController';
import type { ArcGISPolylineOverlayController } from './polyline/ArcGISPolylineController';
import type { ArcGISPolygonOverlayController } from './polygon/ArcGISPolygonController';
import type { ArcGISGroundImageController } from './groundimage/ArcGISGroundImageController';
import type { ClickEvent } from "@arcgis/core/views/input/types";

/**
 * クリックの配送。
 *
 * ArcGIS は `view.hitTest()` でグラフィックを引けるが、マーカー以外の
 * オーバーレイはコア側の緯度経度判定に合わせている（他プロバイダと当たり判定を
 * 揃えるため）。順序は**マーカーが先**で、circle → polygon → polyline →
 * groundImage、どれにも当たらなければ地図のクリックとして扱う。
 */
export interface ClickDeps {
  readonly holder: ArcGISViewHolder;
  readonly markerController: ArcGISMarkerController;
  readonly circleController: ArcGISCircleOverlayController;
  readonly polylineController: ArcGISPolylineOverlayController;
  readonly polygonController: ArcGISPolygonOverlayController;
  readonly groundImageController: ArcGISGroundImageController;
  getCameraPosition(): MapCameraPosition | null;
}

export async function handleMarkerClick(
  deps: ClickDeps,event: ClickEvent): Promise<boolean> {
  // Hit-test against rendered icon bounds in screen space; the geo-nearest
  // lookup (markerController.find) has no distance limit and would claim
  // every map click once any marker exists.
  const marker = deps.markerController.findAtScreen({ x: event.x, y: event.y }, deps.getCameraPosition()?.zoom ?? 0);
  if (!marker) return false;
  if (!marker.state.clickable) return false;
  deps.markerController.dispatchClick(marker.state);
  return true;
}

export async function handleCircleClick(
  deps: ClickDeps,event: ClickEvent, clicked: GeoPoint): Promise<boolean> {
  const screenPoint = { x: event.x, y: event.y };
  const position = deps.holder.fromScreenOffsetSync(screenPoint);
  if (!position) return false;

  const circle = deps.circleController.find(position);
  if (circle) {
    const circleEvent: CircleEvent = { state: circle.state, clicked };
    deps.circleController.dispatchClick(circleEvent);
    return true;
  }
  return false;
}

export async function handlePolygonClick(
  deps: ClickDeps,event: ClickEvent, clicked: GeoPoint): Promise<boolean> {
  const screenPoint = { x: event.x, y: event.y };
  const position = deps.holder.fromScreenOffsetSync(screenPoint);
  if (!position) return false;

  const polygon = deps.polygonController.find(position);
  if (polygon) {
    const polygonEvent: PolygonEvent = { state: polygon.state, clicked };
    deps.polygonController.dispatchClick(polygonEvent);
    return true;
  }
  return false;
}

export async function handlePolylineClick(
  deps: ClickDeps,event: ClickEvent): Promise<boolean> {
  const screenPoint = { x: event.x, y: event.y };
  const position = deps.holder.fromScreenOffsetSync(screenPoint);
  if (!position) return false;

  const hitResult = deps.polylineController.findWithClosestPoint(position);
  if (hitResult) {
    const polylineEvent: PolylineEvent = { 
      state: hitResult.entity.state, 
      clicked: hitResult.closestPoint 
    };
    deps.polylineController.dispatchClick(polylineEvent);
    return true;
  }
  return false;
}

export async function handleGroundImageClick(
  deps: ClickDeps,event: ClickEvent, clicked: GeoPoint): Promise<boolean> {
  const screenPoint = { x: event.x, y: event.y };
  const position = deps.holder.fromScreenOffsetSync(screenPoint);
  if (!position) return false;

  const groundImage = deps.groundImageController.find(position);
  if (groundImage) {
    const groundImageEvent: GroundImageEvent = { state: groundImage.state, clicked };
    deps.groundImageController.dispatchClick(groundImageEvent);
    return true;
  }
  return false;
}
