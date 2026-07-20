import {
  RasterLayerEntity,
  TileScheme,
  type MapCameraPosition,
  type RasterLayerAddParams,
  type RasterLayerChangeParams,
  type RasterLayerOverlayRenderer,
  type RasterLayerSource,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer';
import Point from '@arcgis/core/geometry/Point';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';

// Mirrors ArcGISRasterLayerOverlayRenderer.kt (android-for-arcgis). WebTileLayer
// needs an explicit Web Mercator TileInfo describing the tile server's actual
// (z,x,y) grid — without it esri can't resolve the {level}/{row}/{col}
// template tokens and issues a broken "https://null/..." request.
const WEB_MERCATOR_WKID = 3857;
const WEB_MERCATOR_RADIUS_METERS = 6378137;
const WEB_MERCATOR_MAX = 20037508.3427892;
const WEB_MERCATOR_MIN = -WEB_MERCATOR_MAX;
const DEFAULT_DPI = 96;
const INCHES_PER_METER = 39.37;
const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 22;

export class ArcGISRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<__esri.Layer> {
  constructor(readonly holder: ArcGISViewHolder) {}

  async createRasterLayer(entity: RasterLayerEntity<__esri.Layer>): Promise<__esri.Layer | null> {
    try {
      const layer = this.buildLayer(entity.state.source);
      if (!layer) return null;
      this.holder.map.map?.add(layer);
      return layer;
    } catch (e) {
      console.error('Failed to create raster layer:', e);
      return null;
    }
  }

  async removeRasterLayer(layer: __esri.Layer): Promise<void> {
    this.holder.map.map?.remove(layer);
  }

  async onAdd(data: RasterLayerAddParams[]): Promise<(__esri.Layer | null)[]> {
    return Promise.all(data.map(({ state }) => state.visible ? this.createRasterLayer({ state } as RasterLayerEntity<__esri.Layer>) : null));
  }

  async onChange(data: RasterLayerChangeParams<__esri.Layer>[]): Promise<(__esri.Layer | null)[]> {
    return Promise.all(data.map(async ({ current, prev }) => {
      await this.removeRasterLayer(prev.layer);
      return current.state.visible ? this.createRasterLayer(current) : null;
    }));
  }

  async onRemove(data: RasterLayerEntity<__esri.Layer>[]): Promise<void> {
    await Promise.all(data.map(({ layer }) => this.removeRasterLayer(layer)));
  }

  async onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void> {}
  async onPostProcess(): Promise<void> {}

  private buildLayer(source: RasterLayerSource): __esri.Layer | null {
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

function buildWebMercatorFullExtent(): __esri.ExtentProperties {
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

function buildWebMercatorTileInfo(minZoom: number, maxZoom: number): __esri.TileInfoProperties {
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

function buildWebMercatorLods(minZoom: number, maxZoom: number): __esri.LODProperties[] {
  const initialResolution = (2 * Math.PI * WEB_MERCATOR_RADIUS_METERS) / AGOL_REFERENCE_TILE_SIZE;
  const lods: __esri.LODProperties[] = [];
  for (let level = minZoom; level <= maxZoom; level++) {
    const resolution = initialResolution / 2 ** level;
    const scale = resolution * DEFAULT_DPI * INCHES_PER_METER;
    lods.push({ level, resolution, scale });
  }
  return lods;
}
