import * as actionLogs from '@/db/schema/action_logs';
import * as devices from '@/db/schema/devices';
import * as configs from '@/db/schema/configs';
import * as alerts from '@/db/schema/alerts';
import * as histories from '@/db/schema/histories';

export const schema = { ...actionLogs, ...devices, ...configs, ...alerts, ...histories };
export default schema;