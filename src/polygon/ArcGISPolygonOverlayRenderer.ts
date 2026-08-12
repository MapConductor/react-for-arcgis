import {
  buildUnwrappedPolygonRings,
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
import type SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import type Color from "@arcgis/core/Color";
import type { PolygonProperties } from "@arcgis/core/geometry/Polygon";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

// ArcGIS polygons can become extremely dense when geodesic=true (especially
// for world-mask rings), which may fail to render. Use a larger segment
// length than polylines to keep the geometry size reasonable. (Ported from
// Android's ArcGISPolygonOverlayRenderer.)
const GEODESIC_MAX_SEGMENT_LENGTH_METERS = 100_000;

export class ArcGISPolygonOverlayRenderer implements PolygonOverlayRenderer<Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: GraphicsLayer,
  ) {}

  createPolygon(entity: PolygonEntity<Graphic>): Graphic | null {
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

  updatePolygon(graphic: Graphic, entity: PolygonEntity<Graphic>): void {
    const state = entity.state;
    if (!state.points || state.points.length < 3) return;

    graphic.geometry = this.createGeometry(state);
    graphic.symbol = this.createFillSymbol(state);
    graphic.attributes = { id: state.id, zIndex: state.zIndex };
  }

  removePolygon(graphic: Graphic): void {
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

  // Ported from Android's createGeometry: densify the rings via the shared
  // core pipeline (great-circle when geodesic, linear lat/lng otherwise —
  // Android's straight-line semantics; longitudes unwrapped into the outer
  // ring's world copy, which ArcGIS accepts), then normalize winding — ArcGIS
  // expects clockwise outer rings and counter-clockwise holes.
  //
  // The ring must be CLOSED (first point == last) before densification, so the
  // closing edge (last vertex → first vertex) is interpolated too. Android does
  // this by densifying first and opening afterwards (openRing(toRing(points)));
  // opening before densifying — as an earlier port did — drops the closing
  // vertex, leaving that edge a single straight chord instead of a geodesic arc.
  private createGeometry(state: PolygonState): PolygonProperties & { type: 'polygon' } {
    const resolved = state.holes.length > 1 ? unionHoles(state) : state;

    const { outerRings, holeRings } = buildUnwrappedPolygonRings(
      closeRing(resolved.points),
      resolved.holes.map(closeRing),
      resolved.geodesic,
      GEODESIC_MAX_SEGMENT_LENGTH_METERS,
    );
    const outer = ensureClockwise(outerRings[0] ?? []);
    const holes = holeRings
      .map(ring => ensureCounterClockwise(ring))
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

  private createFillSymbol(state: PolygonState): SimpleFillSymbol {
    const strokeColor = state.strokeColor ?? '#000000';
    const strokeWidth = (state.strokeWidth ?? 2) * CSS_PIXELS_TO_POINTS;
    const fillColor = state.fillColor ?? 'transparent';
    const fill = toArcGISFillStyle(fillColor);
    const stroke = toArcGISFillStyle(strokeColor);

    return {
      type: 'simple-fill',
      style: 'solid',
      color: [...fill.color, fill.opacity] as unknown as Color,
      outline: {
        type: 'simple-line',
        style: 'solid',
        color: [...stroke.color, stroke.opacity] as unknown as Color,
        width: strokeWidth,
      },
    } as SimpleFillSymbol;
  }
}

// Ensure the ring is explicitly closed (first point == last) so the shared
// densification pipeline interpolates the closing edge as well. A ring that is
// already closed is returned unchanged.
function closeRing(points: GeoPoint[]): GeoPoint[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  return first.latitude === last.latitude && first.longitude === last.longitude
    ? points
    : [...points, first];
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
