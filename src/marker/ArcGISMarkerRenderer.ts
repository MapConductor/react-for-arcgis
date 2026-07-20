import {
  AbstractMarkerOverlayRenderer,
  createDefaultIcon,
  MarkerEntity,
  type AddParams,
  type BitmapIcon,
  type ChangeParams,
  type GeoPoint,
} from '@mapconductor/js-sdk-core';
import { ArcGISMarkerRendererInterface } from './ArcGISMarkerRendererInterface';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import { CSS_PIXELS_TO_POINTS } from '../helpers';
import Graphic from '@arcgis/core/Graphic';

const DEFAULT_BITMAP_ICON = createDefaultIcon().toBitmapIcon();

export class ArcGISMarkerRenderer
  extends AbstractMarkerOverlayRenderer<ArcGISViewHolder, __esri.Graphic>
  implements ArcGISMarkerRendererInterface<__esri.Graphic> {
  constructor(
    holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {
    super({ holder });
    this.supportsAnimationOverlay = true;
  }

  createMarker(
    entity: MarkerEntity<__esri.Graphic>,
    bitmapIcon: BitmapIcon = entity.state.icon?.toBitmapIcon() ?? DEFAULT_BITMAP_ICON,
  ): __esri.Graphic | null {
    const state = entity.state;
    const position = state.position;

    const point = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    };

    const markerSymbol = this.createMarkerSymbol(bitmapIcon);

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

  updateMarker(
    graphic: __esri.Graphic,
    entity: MarkerEntity<__esri.Graphic>,
    bitmapIcon: BitmapIcon = entity.state.icon?.toBitmapIcon() ?? DEFAULT_BITMAP_ICON,
  ): void {
    const state = entity.state;
    const position = state.position;

    graphic.geometry = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    } as __esri.PointProperties & { type: 'point' };

    const markerSymbol = this.createMarkerSymbol(bitmapIcon);
    graphic.symbol = markerSymbol;
  }

  removeMarker(graphic: __esri.Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: AddParams[]): Promise<(__esri.Graphic | null)[]> {
    return data.map(({ state, bitmapIcon }) =>
      this.createMarker({ state } as MarkerEntity<__esri.Graphic>, bitmapIcon),
    );
  }

  async onChange(data: ChangeParams<__esri.Graphic>[]): Promise<(__esri.Graphic | null)[]> {
    return data.map(({ current, bitmapIcon }) => {
      if (!current.marker) return this.createMarker(current, bitmapIcon);
      this.updateMarker(current.marker, current, bitmapIcon);
      return current.marker;
    });
  }

  async onRemove(data: MarkerEntity<__esri.Graphic>[]): Promise<void> {
    data.forEach(({ marker }) => { if (marker) this.removeMarker(marker); });
  }

  async onPostProcess(): Promise<void> {}

  setMarkerPosition(entity: MarkerEntity<__esri.Graphic>, position: GeoPoint): void {
    if (!entity.marker) return;
    entity.marker.geometry = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    } as __esri.PointProperties & { type: 'point' };
  }

  override setMarkerVisible(entity: MarkerEntity<__esri.Graphic>, visible: boolean): void {
    if (entity.marker) entity.marker.visible = visible;
  }

  private createMarkerSymbol(bitmapIcon: BitmapIcon): NonNullable<__esri.GraphicProperties['symbol']> {
    const iconUrl = bitmapIcon.url;
    const anchorU = bitmapIcon.anchor.x;
    const anchorV = bitmapIcon.anchor.y;

    // BitmapIcon dimensions are CSS pixels (as consumed by Google Maps and
    // MapLibre), while ArcGIS screen symbols use points. Without this
    // conversion ArcGIS renders every icon at 96 / 72 = 4/3 of its intended
    // size. The bitmap already contains MarkerIcon.scale, so do not apply it
    // again here.
    const width = bitmapIcon.size.width * CSS_PIXELS_TO_POINTS;
    const height = bitmapIcon.size.height * CSS_PIXELS_TO_POINTS;

    // SceneView rejects 2D-only symbols with:
    //   "2D symbol of type 'picture-marker' is unsupported in 3D"
    // so 3D views must use PointSymbol3D + IconSymbol3DLayer.
    if (this.holder.map.type === '3d') {
      const iconLayer: __esri.IconSymbol3DLayerProperties & { type: 'icon' } = {
        type: 'icon',
        size: Math.max(width, height),
        anchor: 'relative',
        // BitmapIcon.anchor is (0,0)=top-left, (1,1)=bottom-right; IconSymbol3DLayer
        // anchorPosition is measured from the icon's CENTER, x=+0.5 at the right
        // edge, y=+0.5 at the bottom edge (see Esri's own PictureMarkerSymbol
        // conversion, IconSymbol3DLayer.fromPictureMarkerSymbol: x=-xoffset/w,
        // y=+yoffset/h). A bottom-center pin (0.5, 1) maps to {x: 0, y: 0.5}.
        anchorPosition: { x: anchorU - 0.5, y: anchorV - 0.5 },
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
      };
    }

    return {
      type: 'picture-marker',
      url: iconUrl,
      width,
      height,
      xoffset: (0.5 - anchorU) * width,
      yoffset: (anchorV - 0.5) * height,
    };
  }
}
