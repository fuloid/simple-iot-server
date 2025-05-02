import * as devices from '@/db/schema/devices';

export interface Sensors {
    water_temp?: number;
    water_acidity?: number;
    water_turbidity?: number;
    water_level?: number;
    air_temp?: number;
    humidity?: number;
    food_level?: number;
}
export interface DeviceData {
    last_ping?: devices.Device['last_ping'];
    last_action?: devices.Device['last_action'];
    cache_data?: Sensors;
    cache_config?: devices.Device['cache_config'];
}
export type Device = DeviceData & {
    updated_at: devices.Device['updated_at'] 
};