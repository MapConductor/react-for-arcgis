import type { GeoRectBounds, MapConfig, MarkerTilingOptions } from '@mapconductor/js-sdk-core';
import type { ArcGISDesignTypeInterface } from './ArcGISMapDesign';

export interface ArcGISMapViewInitOptions {
  basemapStyle: string;
  elevationSources: readonly string[];
}

export interface ArcGISConfig extends MapConfig {
  apiKey?: string;
  mapDesignType?: ArcGISDesignTypeInterface;
  markerTilingOptions?: MarkerTilingOptions;
  useSceneView?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
  restrictBounds?: GeoRectBounds;
}
