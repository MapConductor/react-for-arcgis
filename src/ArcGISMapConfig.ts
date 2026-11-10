import type { GeoRectBounds, MapConfig, MarkerTilingOptions, PolylineTilingOptions } from '@mapconductor/js-sdk-core';
import type { ArcGISDesignTypeInterface } from './ArcGISMapDesign';

export interface ArcGISMapViewInitOptions {
  basemapStyle: string;
  elevationSources: readonly string[];
}

export interface ArcGISConfig extends MapConfig {
  apiKey?: string;
  mapDesignType?: ArcGISDesignTypeInterface;
  markerTilingOptions?: MarkerTilingOptions;
  /**
   * When to draw polylines as raster tiles; {@link PolylineTilingOptions.Default} if omitted.
   * The controller's `setPolylineTilingOptions` replaces it later.
   */
  polylineTilingOptions?: PolylineTilingOptions;
  useSceneView?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
  restrictBounds?: GeoRectBounds;
}
