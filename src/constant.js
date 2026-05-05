import * as THREE from 'three';

export const TRACK_RADIUS = 35;
export const CAMERA_OFFSET = new THREE.Vector3(0, 14, -20);
export const STATION_WORLD = new THREE.Vector3(TRACK_RADIUS, 0, 0);
export const STATION_ANGLE = 0;

export const TRAIN_SPEED = 1.5;        // rad/s
export const WAGON_GAP = 0.11;         // radians between wagon centers
export const MAX_WAGONS = 5;
export const INITIAL_WAGONS = 2;

export const PASSENGER_SPAWN_INTERVAL = 2.0;  // seconds
export const MAX_PLATFORM_PASSENGERS = 10;
export const PASSENGERS_PER_WAGON = 15;
export const MAX_TRAIN_PASSENGERS = 75;
export const BOARDING_ZONE_ARC = 0.6;  // radians around STATION_ANGLE

export const SWAY_SPEED = 1.5;         // Hz
export const SWAY_AMP = 2 * Math.PI / 180;  // 2 degrees
