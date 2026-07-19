import {
  AbstractMarkerController,
  MarkerManager,
  MarkerTilingOptions,
  type MarkerEntity,
  type MarkerState,
  type OnMarkerEventHandler,
} from '@mapconductor/js-sdk-core';
import { ArcGISActualMarker } from '../ArcGISTypeAlias';
import { ArcGISMarkerRendererInterface } from './ArcGISMarkerRendererInterface';

export abstract class AbstractArcGISController<
  ActualMarker = ArcGISActualMarker,
  Renderer extends ArcGISMarkerRendererInterface<ActualMarker> = ArcGISMarkerRendererInterface<ActualMarker>,
> extends AbstractMarkerController<ActualMarker> {
  declare readonly renderer: Renderer;

  constructor(
    renderer: Renderer,
    _tilingOptions: MarkerTilingOptions = MarkerTilingOptions.Default,
  ) {
    super({
      markerManager: MarkerManager.defaultManager<ActualMarker>(
        null,
        _tilingOptions.minMarkerCount,
      ),
      renderer,
    });
  }

  async composition(data: MarkerState[]): Promise<void> {
    await this.add(data);
  }

  has(state: MarkerState): boolean {
    return this.markerManager.hasEntity(state.id);
  }

  override find(position: import('@mapconductor/js-sdk-core').GeoPoint): MarkerEntity<ActualMarker> | null {
    return this.markerManager.findNearest(position);
  }

  setOnClickListener(listener: OnMarkerEventHandler | null): void {
    this.clickListener = listener;
  }

  setOnDragStart(listener: OnMarkerEventHandler | null): void {
    this.dragStartListener = listener;
  }

  setOnDrag(listener: OnMarkerEventHandler | null): void {
    this.dragListener = listener;
  }

  setOnDragEnd(listener: OnMarkerEventHandler | null): void {
    this.dragEndListener = listener;
  }

  setOnAnimateStart(listener: OnMarkerEventHandler | null): void {
    this.animateStartListener = listener;
  }

  setOnAnimateEnd(listener: OnMarkerEventHandler | null): void {
    this.animateEndListener = listener;
  }

  protected override onMarkerAdded(entity: MarkerEntity<ActualMarker>): void {
    if (entity.marker) {
      this.attachListeners(entity.marker, entity.state);
    }
  }

  protected abstract attachListeners(marker: ActualMarker, state: MarkerState): void;
}
