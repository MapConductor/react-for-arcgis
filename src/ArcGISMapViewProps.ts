import type React from 'react';
import type { GeoRectBounds, MapViewBaseProps, MarkerTilingOptions } from '@mapconductor/js-sdk-core';
import type { ArcGISMapViewStateInterface } from './ArcGISMapViewState';

export interface ArcGISMapViewProps extends MapViewBaseProps<ArcGISMapViewStateInterface> {
  style?: React.CSSProperties;
  markerTilingOptions?: MarkerTilingOptions;
  minZoom?: number;
  maxZoom?: number;
  /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
  restrictBounds?: GeoRectBounds;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}
