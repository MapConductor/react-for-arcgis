import type { MapConfig, MarkerTilingOptions } from '@mapconductor/js-sdk-core';
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
}
