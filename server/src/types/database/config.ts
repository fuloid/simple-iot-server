import * as configs from '@/db/schema/configs';

type Hour = `${0|1}${0|1|2|3|4|5|6|7|8|9}`|`2${0|1|2|3}`;
type Minute = `${0|1|2|3|4|5}${0|1|2|3|4|5|6|7|8|9}`;
export type AutoPakanTimeConfig = `${Hour}:${Minute}:00`;

export type AutoPurgeDayConfig = 1|3|7|14|30;

export type AlertThresholdConfig = Record<string, {
    min: number;
    max: number;
}>;

export interface Config {
    auto_pakan_enabled: configs.Config['auto_pakan_enabled'];
    auto_pakan_time: AutoPakanTimeConfig[];
    histories_enabled: configs.Config['histories_enabled'];
    histories_auto_purge_day: AutoPurgeDayConfig;
    alert_enabled: configs.Config['alert_enabled'];
    alert_threshold: AlertThresholdConfig;
}