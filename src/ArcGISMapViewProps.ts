import type React from 'react';
import type { MapViewBaseProps, MarkerTilingOptions } from '@mapconductor/js-sdk-core';
import type { ArcGISMapViewStateInterface } from './ArcGISMapViewState';

export interface ArcGISMapViewProps extends MapViewBaseProps<ArcGISMapViewStateInterface> {
  style?: React.CSSProperties;
  markerTilingOptions?: MarkerTilingOptions;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}
