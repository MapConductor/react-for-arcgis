import {
  createInterpolatePoints,
  unionHoles,
  PolygonEntity,
  type GeoPoint,
  type PolygonAddParams,
  type PolygonChangeParams,
  type PolygonState,
  type PolygonOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import { toArcGISFillStyle } from '../color';
import { CSS_PIXELS_TO_POINTS } from '../helpers';
import Graphic from '@arcgis/core/Graphic';

// ArcGIS polygons can become extremely dense when geodesic=true (especially
// for world-mask rings), which may fail to render. Use a larger segment
// length than polylines to keep the geometry size reasonable. (Ported from
// Android's ArcGISPolygonOverlayRenderer.)
const GEODESIC_MAX_SEGMENT_LENGTH_METERS = 100_000;

export class ArcGISPolygonOverlayRenderer implements PolygonOverlayRenderer<__esri.Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createPolygon(entity: PolygonEntity<__esri.Graphic>): __esri.Graphic | null {
    const state = entity.state;
    if (!state.points || state.points.length < 3) return null;

    const graphic = new Graphic({
      geometry: this.createGeometry(state),
      symbol: this.createFillSymbol(state),
      attributes: {
        id: state.id,
        zIndex: state.zIndex,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updatePolygon(graphic: __esri.Graphic, entity: PolygonEntity<__esri.Graphic>): void {
    const state = entity.state;
    if (!state.points || state.points.length < 3) return;

    graphic.geometry = this.createGeometry(state);
    graphic.symbol = this.createFillSymbol(state);
    graphic.attributes = { id: state.id, zIndex: state.zIndex };
  }

  removePolygon(graphic: __esri.Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: PolygonAddParams[]): Promise<(Graphic | null)[]> {
    return data.map(({ state }) => this.createPolygon({ state } as PolygonEntity<Graphic>));
  }

  async onChange(data: PolygonChangeParams<Graphic>[]): Promise<(Graphic | null)[]> {
    return data.map(({ current }) => {
      if (!current.polygon) return this.createPolygon(current);
      this.updatePolygon(current.polygon, current);
      return current.polygon;
    });
  }

  async onRemove(data: PolygonEntity<Graphic>[]): Promise<void> {
    data.forEach(({ polygon }) => this.removePolygon(polygon));
  }

  async onPostProcess(): Promise<void> {
    // Sort graphics by zIndex to ensure correct rendering order within the
    // polygon layer (ported from Android). Only reorder when needed — the
    // clear/addMany cycle would otherwise flash on every composition.
    const graphics = this.graphicsLayer.graphics.toArray();
    if (graphics.length <= 1) return;

    const sorted = [...graphics].sort(
      (a, b) => ((a.attributes?.zIndex as number) ?? 0) - ((b.attributes?.zIndex as number) ?? 0),
    );
    if (sorted.every((graphic, index) => graphic === graphics[index])) return;

    this.graphicsLayer.graphics.removeAll();
    this.graphicsLayer.graphics.addMany(sorted);
  }

  // Ported from Android's createGeometry: densify geodesic rings ourselves,
  // then normalize winding — ArcGIS expects clockwise outer rings and
  // counter-clockwise holes.
  private createGeometry(state: PolygonState): __esri.PolygonProperties & { type: 'polygon' } {
    const resolved = state.holes.length > 1 ? unionHoles(state) : state;

    const toRing = (points: GeoPoint[]): GeoPoint[] =>
      resolved.geodesic
        ? createInterpolatePoints(points, GEODESIC_MAX_SEGMENT_LENGTH_METERS)
        : points;

    const outer = ensureClockwise(openRing(toRing(resolved.points)));
    const holes = resolved.holes
      .map(ring => ensureCounterClockwise(openRing(toRing(ring))))
      .filter(ring => ring.length >= 3);

    return {
      type: 'polygon',
      // ArcGIS JS expects rings to be explicitly closed (first point == last).
      rings: [outer, ...holes].map(ring =>
        [...ring, ring[0]].map(point => [point.longitude, point.latitude]),
      ),
      spatialReference: { wkid: 4326 },
    };
  }

  private createFillSymbol(state: PolygonState): __esri.SimpleFillSymbol {
    const strokeColor = state.strokeColor ?? '#000000';
    const strokeWidth = (state.strokeWidth ?? 2) * CSS_PIXELS_TO_POINTS;
    const fillColor = state.fillColor ?? 'transparent';
    const fill = toArcGISFillStyle(fillColor);
    const stroke = toArcGISFillStyle(strokeColor);

    return {
      type: 'simple-fill',
      style: 'solid',
      color: [...fill.color, fill.opacity] as unknown as __esri.Color,
      outline: {
        type: 'simple-line',
        style: 'solid',
        color: [...stroke.color, stroke.opacity] as unknown as __esri.Color,
        width: strokeWidth,
      },
    } as __esri.SimpleFillSymbol;
  }
}

function openRing(points: GeoPoint[]): GeoPoint[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  return first.latitude === last.latitude && first.longitude === last.longitude
    ? points.slice(0, -1)
    : points;
}

function signedAreaLonLat(ring: GeoPoint[]): number {
  if (ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.longitude * b.latitude - b.longitude * a.latitude;
  }
  return sum / 2;
}

function ensureClockwise(ring: GeoPoint[]): GeoPoint[] {
  return signedAreaLonLat(ring) < 0 ? ring : [...ring].reverse();
}

function ensureCounterClockwise(ring: GeoPoint[]): GeoPoint[] {
  return signedAreaLonLat(ring) > 0 ? ring : [...ring].reverse();
}
