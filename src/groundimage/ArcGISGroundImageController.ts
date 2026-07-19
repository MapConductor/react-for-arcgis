import {
  GroundImageController,
  GroundImageManager,
  type GroundImageState,
  type OnGroundImageEventHandler,
} from '@mapconductor/js-sdk-core';
import { ArcGISGroundImageOverlayRenderer } from './ArcGISGroundImageOverlayRenderer';

export class ArcGISGroundImageController extends GroundImageController<__esri.Graphic> {
  declare readonly renderer: ArcGISGroundImageOverlayRenderer;

  constructor(renderer: ArcGISGroundImageOverlayRenderer) {
    super({
      groundImageManager: new GroundImageManager<__esri.Graphic>(),
      renderer,
    });
  }

  async composition(data: GroundImageState[]): Promise<void> {
    await this.add(data);
  }

  has(state: GroundImageState): boolean {
    return this.groundImageManager.hasEntity(state.id);
  }

  setOnClickListener(listener: OnGroundImageEventHandler | null): void {
    this.clickListener = listener;
  }
}