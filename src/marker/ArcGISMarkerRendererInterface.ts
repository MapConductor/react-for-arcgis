import type { MarkerEntity, MarkerOverlayRenderer } from '@mapconductor/js-sdk-core';
import type { ArcGISActualMarker } from '../ArcGISTypeAlias';

export interface ArcGISMarkerRendererInterface<ActualMarker = ArcGISActualMarker> extends MarkerOverlayRenderer<ActualMarker> {
  createMarker(state: MarkerEntity<ActualMarker>): ActualMarker | null;
  updateMarker(marker: ActualMarker, state: MarkerEntity<ActualMarker>): void;
  removeMarker(marker: ActualMarker): void;
}
