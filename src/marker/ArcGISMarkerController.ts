import {
  createDefaultIcon,
  createRasterLayerState,
  LocalTileServer,
  MARKER_HIT_RADIUS_MOUSE_PX,
  MarkerTileRenderer,
  MarkerTilingOptions,
  RasterLayerSource,
  type GeoPoint,
  type MarkerEntity,
  type MarkerState,
  type Offset,
  type RasterLayerState,
} from '@mapconductor/js-sdk-core';
import Point from '@arcgis/core/geometry/Point';
import { ArcGISMarkerRenderer } from './ArcGISMarkerRenderer';
import { AbstractArcGISController } from './AbstractArcGISController';

const MARKER_DRAG_THRESHOLD_PX = 3;
const MARKER_HIT_PADDING_PX = 4;
// Same fallback the renderer draws with, so icon-less markers hit-test
// against the default pin's real bounds instead of a dot at the anchor.
const DEFAULT_BITMAP_ICON = createDefaultIcon().toBitmapIcon();

interface ViewDragEventLike {
  action: string;
  x: number;
  y: number;
  button?: number;
  stopPropagation: () => void;
}

export class ArcGISMarkerController extends AbstractArcGISController<__esri.Graphic, ArcGISMarkerRenderer> {
  private dragHandle: { remove(): void } | null = null;
  private dragEntity: MarkerEntity<__esri.Graphic> | null = null;
  // Pointer-to-anchor offset captured on grab so the marker doesn't jump to
  // the cursor when picked up by its icon body instead of its anchor point.
  private dragGrabOffset: Offset | null = null;
  private dragOrigin: Offset | null = null;
  private dragStarted = false;

  // ── Tile rendering (see LeafletMarkerController/MapboxMarkerController for
  // the shared pattern) ────────────────────────────────────────────────────
  private tileRenderer: MarkerTileRenderer<MarkerState> | null = null;
  private tileRouteId: string | null = null;
  private tileVersion = 0;
  private tileGeneration = 0;

  /** Called by ArcGISMapViewController when RasterLayerState changes. */
  onRasterLayerUpdate: ((state: RasterLayerState | null) => Promise<void>) | null = null;

  constructor(
    renderer: ArcGISMarkerRenderer,
    private readonly tilingOptions: MarkerTilingOptions = MarkerTilingOptions.Default,
  ) {
    super(renderer, tilingOptions);
    // ArcGIS has no built-in graphic dragging; intercept the view's drag
    // gesture (stopPropagation keeps the map from panning) and move the
    // grabbed graphic ourselves.
    const view = renderer.holder.map as unknown as {
      on(name: string, handler: (event: ViewDragEventLike) => void): { remove(): void };
    };
    this.dragHandle = view.on('drag', this.handleViewDrag);
  }

  protected override shouldTile(state: MarkerState, totalCount: number): boolean {
    return this.tilingOptions.enabled &&
      totalCount >= this.tilingOptions.minMarkerCount &&
      !state.draggable &&
      state.getAnimation() == null;
  }

  protected override async onTiledMarkersChanged(): Promise<void> {
    await this.syncTiledOverlay();
  }

  findTiled(position: GeoPoint, zoom: number): MarkerEntity<__esri.Graphic> | null {
    const found = this.tileRenderer?.findNearest(position, MARKER_HIT_RADIUS_MOUSE_PX, zoom);
    return found ? this.markerManager.getEntity(found.id) : null;
  }

  private async syncTiledOverlay(): Promise<void> {
    const generation = ++this.tileGeneration;
    const tiledStates = this.markerManager.allEntities()
      .filter(entity => entity.marker === null)
      .map(entity => entity.state);

    if (tiledStates.length === 0) {
      await this.removeTileOverlay();
      return;
    }

    // ArcGIS's WebTileLayer only supports http(s) tile URLs (no custom
    // protocol / tile-load-function hook like Mapbox/Leaflet/OpenLayers use
    // for their offline fallback), so tiling requires the Service Worker
    // path. Where SW is unavailable (non-HTTPS, non-localhost origins),
    // markers fall back to individual (unscaled) rendering as before.
    if (!LocalTileServer.isServiceWorkerSupported()) return;

    this.tileRouteId ??= `mc-arcgis-tile-${generateId()}`;
    const server = LocalTileServer.startServer();
    const renderer = new MarkerTileRenderer(tiledStates, {
      tileSize: 256,
      iconScaleCallback: this.tilingOptions.iconScaleCallback ?? undefined,
    });
    this.tileRenderer = renderer;
    this.tileVersion++;
    server.register(this.tileRouteId, renderer);

    server.startServiceWorker('/tile-sw.js');
    await server.waitForController();
    await server.sendSWRegisterAndWait(this.tileRouteId, await renderer.toSWData());
    const template = server.urlTemplate({
      routeId: this.tileRouteId,
      tileSize: 256,
      cacheKey: String(this.tileVersion),
    });

    if (generation !== this.tileGeneration) return;
    await this.onRasterLayerUpdate?.(createRasterLayerState({
      id: 'mc-marker-tiles',
      source: RasterLayerSource.UrlTemplate({ template, tileSize: 256 }),
    }));
  }

  private async removeTileOverlay(): Promise<void> {
    this.tileGeneration++;
    if (!this.tileRouteId) return;
    LocalTileServer.startServer().unregister(this.tileRouteId);
    this.tileRenderer = null;
    this.tileRouteId = null;
    await this.onRasterLayerUpdate?.(null);
  }

  override async clear(): Promise<void> {
    await this.removeTileOverlay();
    await super.clear();
  }

  protected attachListeners(_marker: __esri.Graphic, _state: MarkerState): void {
    // Click events are handled through the view's click handlers in the view
    // controller; dragging is handled by handleViewDrag below.
  }

  override async update(state: MarkerState): Promise<void> {
    if (this.isDragging(state)) return;
    await super.update(state);
  }

  override destroy(): void {
    this.dragHandle?.remove();
    this.dragHandle = null;
    this.tileGeneration++;
    if (this.tileRouteId) {
      LocalTileServer.startServer().unregister(this.tileRouteId);
      this.tileRouteId = null;
    }
    super.destroy();
  }

  private readonly handleViewDrag = (event: ViewDragEventLike): void => {
    switch (event.action) {
      case 'start': {
        // Secondary-button drags are view navigation (rotate/tilt in 3D).
        if (event.button != null && event.button !== 0) return;
        const entity = this.findDraggableAtScreen(event);
        if (!entity) return;
        event.stopPropagation();
        const anchorScreen = this.renderer.holder.toScreenOffset(entity.state.position);
        this.dragEntity = entity;
        this.dragGrabOffset = anchorScreen
          ? { x: anchorScreen.x - event.x, y: anchorScreen.y - event.y }
          : { x: 0, y: 0 };
        this.dragOrigin = { x: event.x, y: event.y };
        this.dragStarted = false;
        this.setDraggingState(entity.state, true);
        break;
      }
      case 'update': {
        const entity = this.dragEntity;
        if (!entity) return;
        event.stopPropagation();
        if (!this.dragStarted) {
          const origin = this.dragOrigin;
          if (!origin || Math.hypot(event.x - origin.x, event.y - origin.y) < MARKER_DRAG_THRESHOLD_PX) {
            return;
          }
          this.dragStarted = true;
          this.dispatchDragStart(entity.state);
        }
        const position = this.dragPositionFromEvent(event);
        if (!position) return;
        this.moveMarkerGraphic(entity, position);
        entity.state.setPosition(position);
        this.dispatchDrag(entity.state);
        break;
      }
      case 'end': {
        const entity = this.dragEntity;
        if (!entity) return;
        event.stopPropagation();
        const didDrag = this.dragStarted;
        this.dragEntity = null;
        this.dragGrabOffset = null;
        this.dragOrigin = null;
        this.dragStarted = false;
        if (didDrag) {
          const position = this.dragPositionFromEvent(event);
          if (position) {
            this.moveMarkerGraphic(entity, position);
            entity.state.setPosition(position);
          }
        }
        this.setDraggingState(entity.state, false);
        if (didDrag) this.dispatchDragEnd(entity.state);
        void super.update(entity.state);
        break;
      }
    }
  };

  private dragPositionFromEvent(event: ViewDragEventLike): GeoPoint | null {
    const grab = this.dragGrabOffset ?? { x: 0, y: 0 };
    return this.renderer.holder.fromScreenOffsetSync({
      x: event.x + grab.x,
      y: event.y + grab.y,
    });
  }

  private moveMarkerGraphic(entity: MarkerEntity<__esri.Graphic>, position: GeoPoint): void {
    if (!entity.marker) return;
    entity.marker.geometry = new Point({
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    });
  }

  // markerManager.findNearest has no distance limit, so hit-test in screen
  // space against each marker's rendered icon bounds instead. Used for both
  // click dispatch (any marker) and drag start (draggable markers only) — a
  // no-limit nearest search would swallow every map click as a marker click
  // once a single marker exists.
  findAtScreen(screen: Offset, zoom = 0): MarkerEntity<__esri.Graphic> | null {
    const hit = this.findHitAtScreen(screen, () => true);
    if (hit) return hit;
    if (!this.tileRenderer) return null;
    const position = this.renderer.holder.fromScreenOffsetSync(screen);
    return position ? this.findTiled(position, zoom) : null;
  }

  private findDraggableAtScreen(screen: Offset): MarkerEntity<__esri.Graphic> | null {
    return this.findHitAtScreen(screen, state => state.draggable);
  }

  private findHitAtScreen(
    screen: Offset,
    filter: (state: MarkerState) => boolean,
  ): MarkerEntity<__esri.Graphic> | null {
    let best: MarkerEntity<__esri.Graphic> | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const entity of this.markerManager.allEntities()) {
      const state = entity.state;
      if (!filter(state) || !entity.marker) continue;
      const anchorScreen = this.renderer.holder.toScreenOffset(state.position);
      if (!anchorScreen) continue;

      const bitmapIcon = state.icon?.toBitmapIcon() ?? DEFAULT_BITMAP_ICON;
      const width = bitmapIcon.size.width;
      const height = bitmapIcon.size.height;
      let hit: boolean;
      if (width && height) {
        const left = anchorScreen.x - bitmapIcon.anchor.x * width - MARKER_HIT_PADDING_PX;
        const top = anchorScreen.y - bitmapIcon.anchor.y * height - MARKER_HIT_PADDING_PX;
        hit = screen.x >= left && screen.x <= left + width + MARKER_HIT_PADDING_PX * 2 &&
          screen.y >= top && screen.y <= top + height + MARKER_HIT_PADDING_PX * 2;
      } else {
        hit = Math.hypot(anchorScreen.x - screen.x, anchorScreen.y - screen.y) <= MARKER_HIT_RADIUS_MOUSE_PX;
      }
      if (!hit) continue;

      const dist = Math.hypot(anchorScreen.x - screen.x, anchorScreen.y - screen.y);
      if (dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }
    return best;
  }
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}
