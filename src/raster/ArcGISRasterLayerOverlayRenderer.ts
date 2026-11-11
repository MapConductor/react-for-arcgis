import {
  Earth,
  RasterLayerEntity,
  TileScheme,
  WEB_MERCATOR_MAX_EXTENT_METERS,
  type MapCameraPosition,
  type RasterLayerAddParams,
  type RasterLayerChangeParams,
  type RasterLayerOverlayRenderer,
  type RasterLayerSource,
  type RasterLayerState,
  overlayStackBeforeId,
  type OverlayStackKey,
  POLYGON_TILE_LAYER_ID,
  POLYLINE_TILE_LAYER_ID,
  CIRCLE_TILE_LAYER_ID,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer';
import Point from '@arcgis/core/geometry/Point';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import type { LODProperties } from "@arcgis/core/layers/support/LOD";
import type { TileInfoProperties } from "@arcgis/core/layers/support/TileInfo";
import type { ExtentProperties } from "@arcgis/core/geometry/Extent";
import type Layer from "@arcgis/core/layers/Layer";

// Mirrors ArcGISRasterLayerOverlayRenderer.kt (android-for-arcgis). WebTileLayer
// needs an explicit Web Mercator TileInfo describing the tile server's actual
// (z,x,y) grid — without it esri can't resolve the {level}/{row}/{col}
// template tokens and issues a broken "https://null/..." request.
const WEB_MERCATOR_WKID = 3857;
const WEB_MERCATOR_RADIUS_METERS = Earth.RADIUS_METERS;
const WEB_MERCATOR_MAX = WEB_MERCATOR_MAX_EXTENT_METERS;
const WEB_MERCATOR_MIN = -WEB_MERCATOR_MAX;
const DEFAULT_DPI = 96;
const INCHES_PER_METER = 39.37;
const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 22;

export class ArcGISRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<Layer> {
  constructor(readonly holder: ArcGISViewHolder) {}

  async createRasterLayer(entity: RasterLayerEntity<Layer>): Promise<Layer | null> {
    try {
      const layer = this.buildLayer(entity.state.source);
      if (!layer) return null;
      const map = this.holder.map.map;
      if (map) map.add(layer, this.stackIndex(layer, entity.state));
      return layer;
    } catch (e) {
      console.error('Failed to create raster layer:', e);
      return null;
    }
  }

  async removeRasterLayer(layer: Layer): Promise<void> {
    this.holder.map.map?.remove(layer);
    this.stackKeys.delete(layer);
  }

  // Stacking keys of the raster layers this renderer added.
  private readonly stackKeys = new Map<Layer, OverlayStackKey>();
  private stackSequence = 0;

  /**
   * Where a raster goes among the map's operational layers: the lowest overlay band, under the
   * ground-image media layer and the graphics layers (js-sdk-core OVERLAY_STACK_ORDER), ordered
   * by zIndex among the rasters. It used to be appended, on top of every overlay and marker.
   * Marker tiles are mounted as a raster but belong with the markers; polygon tiles with the
   * polygons, under the polygon graphics layer (the natively drawn ones) and over ground images;
   * circle tiles with the circles, over the polygon graphics layer and under the circle graphics
   * layer; polyline tiles with the polylines, over the circles and under the polyline graphics layer.
   */
  private stackIndex(layer: Layer, state: RasterLayerState): number {
    const key: OverlayStackKey =
      state.id === 'mc-marker-tiles'
        ? { kind: 'marker', sub: 0 }
        : state.id === POLYGON_TILE_LAYER_ID
          ? { kind: 'polygon', sub: -1 }
          : state.id === CIRCLE_TILE_LAYER_ID
            ? { kind: 'circle', sub: -1 }
            : state.id === POLYLINE_TILE_LAYER_ID
              ? { kind: 'polyline', sub: -1 }
              : { kind: 'rasterLayer', zIndex: state.zIndex, sequence: ++this.stackSequence };
    this.stackKeys.set(layer, key);
    const layers = this.holder.map.map?.layers.toArray() ?? [];
    const ids = layers.map((_, i) => String(i));
    const beforeId = overlayStackBeforeId(ids, (id) => this.stackKeyOf(layers[Number(id)]), key);
    return beforeId == null ? layers.length : Number(beforeId);
  }

  private stackKeyOf(layer: Layer): OverlayStackKey | null {
    const own = this.stackKeys.get(layer);
    if (own) return own;
    switch (layer.id) {
      case 'ground-image-layer': return { kind: 'groundImage' };
      case 'polygon-layer': return { kind: 'polygon' };
      case 'circle-layer': return { kind: 'circle' };
      case 'polyline-layer': return { kind: 'polyline' };
      case 'marker-layer': return { kind: 'marker', sub: 1 };
      default: return null;
    }
  }

  async onAdd(data: RasterLayerAddParams[]): Promise<(Layer | null)[]> {
    return Promise.all(data.map(({ state }) => state.visible ? this.createRasterLayer({ state } as RasterLayerEntity<Layer>) : null));
  }

  async onChange(data: RasterLayerChangeParams<Layer>[]): Promise<(Layer | null)[]> {
    return Promise.all(data.map(async ({ current, prev }) => {
      await this.removeRasterLayer(prev.layer);
      return current.state.visible ? this.createRasterLayer(current) : null;
    }));
  }

  async onRemove(data: RasterLayerEntity<Layer>[]): Promise<void> {
    await Promise.all(data.map(({ layer }) => this.removeRasterLayer(layer)));
  }

  async onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void> {}
  async onPostProcess(): Promise<void> {}

  private buildLayer(source: RasterLayerSource): Layer | null {
    if (source.type === 'TileJson') {
      console.warn('[ArcGIS] ArcGIS raster layers do not support TileJson sources.');
      return null;
    }

    if (source.type === 'ArcGisService') {
      return new WebTileLayer({
        urlTemplate: `${source.serviceUrl.replace(/\/+$/, '')}/tile/{level}/{row}/{col}`,
        fullExtent: buildWebMercatorFullExtent(),
      });
    }

    if (source.scheme === TileScheme.TMS) {
      console.warn('[ArcGIS] TMS scheme is not supported for WebTileLayer.');
      return null;
    }

    const urlTemplate = absolutizeTemplate(source.template)
      .replace(/\{z\}/g, '{level}')
      .replace(/\{x\}/g, '{col}')
      .replace(/\{y\}/g, '{row}');
    const minZoom = source.minZoom ?? DEFAULT_MIN_ZOOM;
    const maxZoom = source.maxZoom ?? DEFAULT_MAX_ZOOM;

    return new WebTileLayer({
      urlTemplate,
      tileInfo: buildWebMercatorTileInfo(minZoom, maxZoom),
      // SceneView (3D) refuses to resolve a WebTileLayer's layer view unless
      // fullExtent is explicitly set by the caller in tileInfo's spatial
      // reference (see @arcgis/core TileLayerView3D#initialize) — MapView
      // (2D) infers it fine, but 3D throws "layerview:incompatible-fullextent"
      // and logs "Failed to resolve layer view" if it's left as the default.
      fullExtent: buildWebMercatorFullExtent(),
    });
  }
}

// ArcGIS's WebTileLayer parses `urlTemplate` with its own lightweight URL
// parser rather than resolving it against the page like a browser would, so
// root-relative templates (e.g. from LocalTileServer, used for tile-based
// marker rendering) end up with a null authority and are requested as
// "https://null/...". Absolutize them against the page origin first.
function absolutizeTemplate(template: string): string {
  if (typeof location === 'undefined') return template;
  if (/^[a-z][a-z0-9+.-]*:/i.test(template) || template.startsWith('//')) return template;
  return template.startsWith('/') ? `${location.origin}${template}` : `${location.origin}/${template}`;
}

function buildWebMercatorFullExtent(): ExtentProperties {
  return {
    xmin: WEB_MERCATOR_MIN,
    ymin: WEB_MERCATOR_MIN,
    xmax: WEB_MERCATOR_MAX,
    ymax: WEB_MERCATOR_MAX,
    spatialReference: { wkid: WEB_MERCATOR_WKID },
  };
}

// ArcGIS Online's canonical Web Mercator tiling scheme is defined against a
// 256px reference tile (resolution(level) = circumference / (256 * 2**level)).
// SceneView (3D) rejects any WebTileLayer whose tileInfo isn't compatible
// with that exact table (`TilingScheme.makeWebMercatorAuxiliarySphere(...)
// .compatibleWith(tileInfo)` — see @arcgis/core terrainUtilsSpherical),
// throwing "layerview:tiling-scheme-unsupported" / "The tiling scheme of
// this layer is not supported by SceneView" otherwise.
//
// Our tile renderers (GeoJSONTileRenderer, HeatmapTileRenderer, ...) serve
// 512px images but still divide the world into 2**z tiles per axis just like
// the standard scheme — only the pixel density differs (512px tiles are a
// "retina"/2x version of the same 256px grid squares). So we declare the
// tileInfo using the 256 reference (matching AGOL and satisfying SceneView),
// which yields the *same* on-screen footprint per level as before: footprint
// = resolution * size = circumference / 2**level either way, independent of
// which reference size the formula uses, as long as `size` and the
// resolution formula agree. The actual served images stay at their real
// pixel size (512px) — WebTileLayer scales whatever it fetches to fit the
// computed footprint, so the extra pixel density is harmless.
const AGOL_REFERENCE_TILE_SIZE = 256;

function buildWebMercatorTileInfo(minZoom: number, maxZoom: number): TileInfoProperties {
  const spatialReference = new SpatialReference({ wkid: WEB_MERCATOR_WKID });
  const origin = new Point({ x: WEB_MERCATOR_MIN, y: WEB_MERCATOR_MAX, spatialReference });
  return {
    dpi: DEFAULT_DPI,
    format: 'png',
    lods: buildWebMercatorLods(minZoom, maxZoom),
    origin,
    spatialReference,
    size: [AGOL_REFERENCE_TILE_SIZE, AGOL_REFERENCE_TILE_SIZE],
  };
}

function buildWebMercatorLods(minZoom: number, maxZoom: number): LODProperties[] {
  const initialResolution = (2 * Math.PI * WEB_MERCATOR_RADIUS_METERS) / AGOL_REFERENCE_TILE_SIZE;
  const lods: LODProperties[] = [];
  for (let level = minZoom; level <= maxZoom; level++) {
    const resolution = initialResolution / 2 ** level;
    const scale = resolution * DEFAULT_DPI * INCHES_PER_METER;
    lods.push({ level, resolution, scale });
  }
  return lods;
}
