import type React from 'react';
import type { GeoRectBounds, MapViewBaseProps, MarkerTilingOptions, PolylineTilingOptions } from '@mapconductor/js-sdk-core';
import type { ArcGISMapViewStateInterface } from './ArcGISMapViewState';

export interface ArcGISMapViewProps extends MapViewBaseProps<ArcGISMapViewStateInterface> {
  style?: React.CSSProperties;
  markerTilingOptions?: MarkerTilingOptions;
  /**
   * When to draw polylines as raster tiles ({@link PolylineTilingOptions.Default} if omitted).
   * Read when the map is created; a later value applies from the next time the polylines are
   * handed to the map.
   */
  polylineTilingOptions?: PolylineTilingOptions;
  minZoom?: number;
  maxZoom?: number;
  /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
  restrictBounds?: GeoRectBounds;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}
