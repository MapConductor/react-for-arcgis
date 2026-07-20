import { AbstractZoomAltitudeConverter, MapCameraPosition } from '@mapconductor/js-sdk-core';

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export interface ZoomAltitudeViewportSize {
    width: number;
    height: number;
}

export class ZoomAltitudeConverter extends AbstractZoomAltitudeConverter {
    static readonly ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE = 136_500_000.0;
    // Reference map view height, calibrated to match a standard modern phone
    // (mirrors Android's REFERENCE_HEIGHT_DP). Google Maps shows geographic
    // range proportional to viewport pixels, so we scale altitude linearly
    // with viewport height to match that behaviour.
    static readonly REFERENCE_VIEWPORT_HEIGHT_PX = 720;

    constructor(
        zoom0Altitude = ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE,
        private readonly viewportSizeProvider: (() => ZoomAltitudeViewportSize | null) | null = null,
    ) {
        super(zoom0Altitude);
    }

    private effectiveZoom0Altitude(): number {
        const height = this.viewportSizeProvider?.()?.height;
        const viewportScale = height == null || !Number.isFinite(height) || height <= 0
            ? 1
            : height / ZoomAltitudeConverter.REFERENCE_VIEWPORT_HEIGHT_PX;
        return this.zoom0Altitude * viewportScale;
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
