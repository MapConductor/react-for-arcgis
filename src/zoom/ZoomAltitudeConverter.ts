import { AbstractZoomAltitudeConverter, MapCameraPosition } from '@mapconductor/js-sdk-core';

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export interface ZoomAltitudeViewportSize {
    width: number;
    height: number;
}

export class ZoomAltitudeConverter extends AbstractZoomAltitudeConverter {
    static readonly ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE = 136_500_000.0;
    // Legacy fallback: reference map view height calibrated on a phone-like
    // viewport (mirrors Android's REFERENCE_HEIGHT_DP). Only used when the
    // viewport width is unknown; see effectiveZoom0Altitude.
    static readonly REFERENCE_VIEWPORT_HEIGHT_PX = 720;
    // SceneView's Camera.fov default (degrees). ArcGIS defines fov as the
    // DIAGONAL field of view, so the ground extent covered by the camera is
    // fixed along the viewport diagonal, not its height.
    static readonly SCENE_VIEW_DIAGONAL_FOV_DEG = 55;

    constructor(
        zoom0Altitude = ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE,
        private readonly viewportSizeProvider: (() => ZoomAltitudeViewportSize | null) | null = null,
    ) {
        super(zoom0Altitude);
    }

    private effectiveZoom0Altitude(): number {
        const size = this.viewportSizeProvider?.();
        const width = size?.width;
        const height = size?.height;
        const validHeight = height != null && Number.isFinite(height) && height > 0;
        const validWidth = width != null && Number.isFinite(width) && width > 0;
        if (validHeight && validWidth) {
            // Google Maps shows WEB_MERCATOR_INITIAL_MPP_256 * cos(lat) / 2^zoom
            // ground meters per screen pixel. SceneView spreads its diagonal fov
            // over the viewport diagonal, so at altitude z one pixel covers
            // 2 * z * tan(fov / 2) / diagonalPx meters. Solving for z at zoom 0
            // (cos(lat) is applied by the callers) gives the altitude below.
            // Scaling by height alone (the Android-derived heuristic) matches
            // only phone-like aspect ratios and over-zooms wide viewports.
            const diagonalPx = Math.hypot(width, height);
            const halfFovRad = degToRad(ZoomAltitudeConverter.SCENE_VIEW_DIAGONAL_FOV_DEG / 2);
            return (AbstractZoomAltitudeConverter.WEB_MERCATOR_INITIAL_MPP_256 * diagonalPx)
                / (2 * Math.tan(halfFovRad));
        }
        if (validHeight) {
            return this.zoom0Altitude * (height / ZoomAltitudeConverter.REFERENCE_VIEWPORT_HEIGHT_PX);
        }
        return this.zoom0Altitude;
    }

    private cosLatitudeFactor(latitude: number): number {
        const clamped = Math.max(-85, Math.min(85, latitude));
        const latRad = (clamped * Math.PI) / 180;
        return Math.max(AbstractZoomAltitudeConverter.MIN_COS_LAT, Math.abs(Math.cos(latRad)));
    }

    private cosTiltFactor(tilt: number): number {
        const clamped = Math.max(0, Math.min(90, tilt));
        const tiltRad = (clamped * Math.PI) / 180;
        return Math.max(AbstractZoomAltitudeConverter.MIN_COS_TILT, Math.cos(tiltRad));
    }

    zoomLevelToAltitude({
        zoomLevel,
        latitude,
        tilt,
    }: {
        zoomLevel: number;
        latitude: number;
        tilt: number;
    }): number {
        const distance = this.zoomLevelToDistance({ zoomLevel, latitude });
        const cosTilt = this.cosTiltFactor(tilt);
        const altitude = distance * cosTilt;
        return Math.min(Math.max(altitude, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
    }

    altitudeToZoomLevel({
        altitude,
        latitude,
        tilt,
    }: {
        altitude: number;
        latitude: number;
        tilt: number;
    }): number {
        const clampedAltitude = Math.min(Math.max(altitude, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
        const cosTilt = this.cosTiltFactor(tilt);
        return this.distanceToZoomLevel({ distance: clampedAltitude / cosTilt, latitude });
    }

    zoomLevelToDistance({
        zoomLevel,
        latitude,
    }: {
        zoomLevel: number;
        latitude: number;
    }): number {
        const clampedZoom = Math.min(Math.max(zoomLevel, AbstractZoomAltitudeConverter.MIN_ZOOM_LEVEL), AbstractZoomAltitudeConverter.MAX_ZOOM_LEVEL);
        const cosLat = this.cosLatitudeFactor(latitude);
        const distance = (this.effectiveZoom0Altitude() * cosLat) / Math.pow(AbstractZoomAltitudeConverter.ZOOM_FACTOR, clampedZoom);
        return Math.min(Math.max(distance, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
    }

    distanceToZoomLevel({
        distance,
        latitude,
    }: {
        distance: number;
        latitude: number;
    }): number {
        const clampedDistance = Math.min(Math.max(distance, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
        const cosLat = this.cosLatitudeFactor(latitude);
        const zoomLevel = Math.log2((this.effectiveZoom0Altitude() * cosLat) / clampedDistance);
        return Math.min(Math.max(zoomLevel, AbstractZoomAltitudeConverter.MIN_ZOOM_LEVEL), AbstractZoomAltitudeConverter.MAX_ZOOM_LEVEL);
    }

    mapCameraPositionToCameraOptions(cameraPosition: MapCameraPosition | null): __esri.CameraProperties | null {
        if (!cameraPosition) {
            return null;
        }
        const { position, zoom, bearing, tilt } = cameraPosition;

        const distance = this.zoomLevelToDistance({ zoomLevel: zoom, latitude: position.latitude });
        const altitude = distance * Math.cos(degToRad(tilt));

        return {
            position: {
                x: position.longitude,
                y: position.latitude,
                z: altitude,
            },
            heading: bearing,
            tilt: tilt,
        };
    }
}
