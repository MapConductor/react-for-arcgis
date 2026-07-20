import {
  MapViewHolderBase,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';
import { ZoomAltitudeConverter } from './zoom';
import Point from '@arcgis/core/geometry/Point';

export class ArcGISViewHolder extends MapViewHolderBase<HTMLElement, __esri.SceneView | __esri.MapView> {
  constructor(
    readonly mapView: HTMLElement,
    readonly map: __esri.SceneView | __esri.MapView,
    readonly zoomConverter: ZoomAltitudeConverter,
  ) {
    super();
  }

  toScreenOffset(position: GeoPointInterface): Offset | null {
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
    } catch (e) {
      return null;
    }
  }

  async fromScreenOffset(offset: Offset): Promise<GeoPoint | null> {
    return this.fromScreenOffsetSync(offset);
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint | null {
    try {
      const screenPoint = {
        x: offset.x,
        y: offset.y,
      };

      const point = this.map.toMap(screenPoint) as __esri.Point;
      if (!point) return null;

      return createGeoPoint({
        latitude: point.latitude ?? 0,
        longitude: point.longitude ?? 0,
        altitude: point.z ?? undefined,
      });
    } catch (e) {
      return null;
    }
  }
}
