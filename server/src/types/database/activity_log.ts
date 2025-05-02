import * as actionLogs from '@/db/schema/action_logs';

export const titles: Record<actionLogs.ActionLog['type'], string> = {
    device_auth: "IoT logged in successfully",
    device_update_action: "IoT updated an action state",
    user_auth: 'User logged in successfully',
    user_send_action: 'User sent an action to IoT',
} as const;

export interface ActionLogItem {
    id: string;
    type: actionLogs.ActionLog['type'];
    title: typeof titles[actionLogs.ActionLog['type']];
    metadata: actionLogs.ActionLog['metadata'];
    created_at: string;
}