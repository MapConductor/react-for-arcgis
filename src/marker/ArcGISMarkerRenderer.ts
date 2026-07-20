import {
  MarkerEntity,
  type AddParams,
  type ChangeParams,
  type MarkerAnimationOverlayHost,
  type MarkerOverlayRenderer,
  type MarkerState,
} from '@mapconductor/js-sdk-core';
import { ArcGISMarkerRendererInterface } from './ArcGISMarkerRendererInterface';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import Graphic from '@arcgis/core/Graphic';

export class ArcGISMarkerRenderer implements ArcGISMarkerRendererInterface<__esri.Graphic>, MarkerOverlayRenderer<__esri.Graphic> {
  animateStartListener = null;
  animateEndListener = null;
  animationOverlayHost: MarkerAnimationOverlayHost | null = null;
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createMarker(entity: MarkerEntity<__esri.Graphic>): __esri.Graphic | null {
    const state = entity.state;
    const position = state.position;

    const point = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    };

    const markerSymbol = this.createMarkerSymbol(state);

    const graphic = new Graphic({
      geometry: point as __esri.PointProperties & { type: 'point' },
      symbol: markerSymbol,
      attributes: {
        id: state.id,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updateMarker(graphic: __esri.Graphic, entity: MarkerEntity<__esri.Graphic>): void {
    const state = entity.state;
    const position = state.position;

    graphic.geometry = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    } as __esri.PointProperties & { type: 'point' };

    const markerSymbol = this.createMarkerSymbol(state);
    graphic.symbol = markerSymbol;
  }

  removeMarker(graphic: __esri.Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: AddParams[]): Promise<(__esri.Graphic | null)[]> {
    return data.map(({ state }) => this.createMarker({ state } as MarkerEntity<__esri.Graphic>));
  }

  async onChange(data: ChangeParams<__esri.Graphic>[]): Promise<(__esri.Graphic | null)[]> {
    return data.map(({ current }) => {
      if (!current.marker) return this.createMarker(current);
      this.updateMarker(current.marker, current);
      return current.marker;
    });
  }

  async onRemove(data: MarkerEntity<__esri.Graphic>[]): Promise<void> {
    data.forEach(({ marker }) => { if (marker) this.removeMarker(marker); });
  }

  async onAnimate(_entity: MarkerEntity<__esri.Graphic>): Promise<void> {}
  async onPostProcess(): Promise<void> {}

  setMarkerVisible(entity: MarkerEntity<__esri.Graphic>, visible: boolean): void {
    if (entity.marker) entity.marker.visible = visible;
  }

  private createMarkerSymbol(state: MarkerState): __esri.Symbol {
    const icon = state.icon?.toBitmapIcon();
    const iconUrl = icon?.url ?? '';
    const anchorU = icon?.anchor.x ?? 0.5;
    const anchorV = icon?.anchor.y ?? 1.0;
    const scale = state.icon?.scale ?? 1.0;
    const width = (icon?.size.width ?? 32) * scale;
    const height = (icon?.size.height ?? 32) * scale;

    // SceneView rejects 2D-only symbols with:
    //   "2D symbol of type 'picture-marker' is unsupported in 3D"
    // so 3D views must use PointSymbol3D + IconSymbol3DLayer.
    if (this.holder.map.type === '3d') {
      const iconLayer: __esri.IconSymbol3DLayerProperties = {
        type: 'icon',
        size: Math.max(width, height),
        anchor: 'relative',
        // BitmapIcon.anchor is (0,0)=top-left, (1,1)=bottom-right; IconSymbol3DLayer
        // anchorPosition is (0,0)=bottom-left, (1,1)=top-right, so flip Y.
        anchorPosition: { x: anchorU, y: 1 - anchorV },
      };
      if (iconUrl) {
        iconLayer.resource = { href: iconUrl };
      } else {
        iconLayer.resource = { primitive: 'circle' };
        iconLayer.material = { color: 'red' };
      }
      return {
        type: 'point-3d',
        symbolLayers: [iconLayer],
      } as unknown as __esri.PointSymbol3D;
    }

    return {
      type: 'picture-marker',
      url: iconUrl,
      width,
      height,
      xoffset: -width / 2 * (2 * anchorU - 1),
      yoffset: -height * (1 - anchorV),
    } as unknown as __esri.PictureMarkerSymbol;
  }
}
