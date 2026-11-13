import {
  MapCoordinateSystem,
  MapViewHolderBase,
  ProjectedUnit,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';
import Point from '@arcgis/core/geometry/Point';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import * as projectOperator from '@arcgis/core/geometry/operators/projectOperator';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import type MapView from "@arcgis/core/views/MapView";

const WGS84 = new SpatialReference({ wkid: 4326 });

/**
 * ArcGIS spatial reference -> MapCoordinateSystem.
 *
 * - A WKID of 32767 or below is the EPSG number itself: `EPSG:<wkid>`.
 * - Esri's own numbers are `ESRI:<wkid>`, except Web Mercator's old ones
 *   (102100 / 102113), which become EPSG:3857.
 * - A spatial reference defined only by WKT (no WKID) has a null code.
 */
function toMapCoordinateSystem(reference: SpatialReference): MapCoordinateSystem {
  const wkid = reference.latestWkid ?? reference.wkid;
  const code =
    wkid == null || wkid === 0 ? null
      : wkid === 102100 || wkid === 102113 ? 'EPSG:3857'
        : wkid <= 32767 ? `EPSG:${wkid}`
          : `ESRI:${wkid}`;
  const unit =
    reference.isGeographic ? ProjectedUnit.Degrees
      : reference.unit === 'meters' ? ProjectedUnit.Meters
        : ProjectedUnit.Other;
  return { code, unit };
}

/**
 * Projects a point synchronously. Web Mercator <-> geographic needs nothing
 * loaded; any other pair goes through projectOperator, which the holder starts
 * loading on construction. Null until it has loaded, or when ArcGIS cannot
 * project the point.
 */
function project(point: Point, into: SpatialReference): Point | null {
  let projected: unknown;
  if (webMercatorUtils.canProject(point, into)) {
    projected = webMercatorUtils.project(point, into);
  } else if (projectOperator.isLoaded()) {
    projected = projectOperator.execute(point, into);
  } else {
    return null;
  }
  const result = projected as Point | null | undefined;
  if (!result || !Number.isFinite(result.x) || !Number.isFinite(result.y)) return null;
  return result;
}

export class ArcGISViewHolder2D extends MapViewHolderBase<HTMLDivElement, MapView> {
  constructor(
    readonly mapView: HTMLDivElement,
    readonly map: MapView,
  ) {
    super();
    // Projecting into a spatial reference other than Web Mercator / WGS84 needs
    // this loaded; toProjectedPoint returns null until it is.
    if (!projectOperator.isLoaded()) void projectOperator.load().catch(() => undefined);
  }

  /**
   * The 2D map has a spatial reference, so projected points are in it. Before
   * the view has one, the core default (EPSG:3857). The 3D SceneView
   * ({@link ArcGISViewHolder}) shows a globe and keeps the default.
   */
  override get coordinateSystem(): MapCoordinateSystem {
    const reference = this.map.spatialReference;
    return reference ? toMapCoordinateSystem(reference) : MapCoordinateSystem.WebMercator;
  }

  override toProjectedPoint(position: GeoPointInterface): Offset | null {
    const reference = this.map.spatialReference;
    if (!reference) return super.toProjectedPoint(position);
    const geographic = new Point({ longitude: position.longitude, latitude: position.latitude, spatialReference: WGS84 });
    const projected = project(geographic, reference);
    return projected ? { x: projected.x, y: projected.y } : null;
  }

  override fromProjectedPoint(point: Offset): GeoPoint | null {
    const reference = this.map.spatialReference;
    if (!reference) return super.fromProjectedPoint(point);
    const geographic = project(new Point({ x: point.x, y: point.y, spatialReference: reference }), WGS84);
    return geographic ? createGeoPoint({ latitude: geographic.y, longitude: geographic.x }) : null;
  }

  toScreenOffset(position: GeoPointInterface): Offset | null {
    try {
      const point = {
        type: 'point',
        longitude: position.longitude,
        latitude: position.latitude,
        spatialReference: { wkid: 4326 },
      };

      const screenPoint = this.map.toScreen(point as Point);
      if (!screenPoint) return null;

      return {
        x: screenPoint.x,
        y: screenPoint.y,
      };
    } catch {
      return null;
    }
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint | null {
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
