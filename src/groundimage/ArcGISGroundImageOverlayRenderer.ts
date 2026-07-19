import {
  GroundImageEntity,
  type GroundImageAddParams,
  type GroundImageChangeParams,
  type GroundImageOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import Graphic from '@arcgis/core/Graphic';

export class ArcGISGroundImageOverlayRenderer implements GroundImageOverlayRenderer<__esri.Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createGroundImage(entity: GroundImageEntity<__esri.Graphic>): __esri.Graphic | null {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;
    
    if (!bounds || !bounds.southWest || !bounds.northEast || !imageUrl) return null;
    const southWest = bounds.southWest;
    const northEast = bounds.northEast;

    const polygon = {
      type: 'polygon' as const,
      rings: [[
        [southWest.longitude, southWest.latitude],
        [southWest.longitude, northEast.latitude],
        [northEast.longitude, northEast.latitude],
        [northEast.longitude, southWest.latitude],
        [southWest.longitude, southWest.latitude],
      ]],
      spatialReference: { wkid: 4326 },
    } as __esri.PolygonProperties & { type: 'polygon' };

    const fillSymbol = {
      type: 'picture-fill' as const,
      url: imageUrl,
      width: northEast.longitude - southWest.longitude,
      height: northEast.latitude - southWest.latitude,
      outline: {
        type: 'simple-line' as const,
        style: 'solid' as const,
        color: [0, 0, 0, 0],
        width: 0,
      },
    } as __esri.PictureFillSymbolProperties & { type: 'picture-fill' };

    const graphic = new Graphic({
      geometry: polygon,
      symbol: fillSymbol,
      attributes: {
        id: state.id,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updateGroundImage(graphic: __esri.Graphic, entity: GroundImageEntity<__esri.Graphic>): void {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;
    
    if (!bounds || !bounds.southWest || !bounds.northEast || !imageUrl) return;
    const southWest = bounds.southWest;
    const northEast = bounds.northEast;

    graphic.geometry = {
      type: 'polygon',
      rings: [[
        [southWest.longitude, southWest.latitude],
        [southWest.longitude, northEast.latitude],
        [northEast.longitude, northEast.latitude],
        [northEast.longitude, southWest.latitude],
        [southWest.longitude, southWest.latitude],
      ]],
      spatialReference: { wkid: 4326 },
    };

    (graphic.symbol as __esri.PictureFillSymbol).url = imageUrl;
  }

  removeGroundImage(graphic: __esri.Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: GroundImageAddParams[]): Promise<(Graphic | null)[]> {
    return data.map(({ state }) => this.createGroundImage({ state } as GroundImageEntity<Graphic>));
  }

  async onChange(data: GroundImageChangeParams<Graphic>[]): Promise<(Graphic | null)[]> {
    return data.map(({ current }) => {
      if (!current.groundImage) return this.createGroundImage(current);
      this.updateGroundImage(current.groundImage, current);
      return current.groundImage;
    });
  }

  async onRemove(data: GroundImageEntity<Graphic>[]): Promise<void> {
    data.forEach(({ groundImage }) => this.removeGroundImage(groundImage));
  }

  async onPostProcess(): Promise<void> {}
}
