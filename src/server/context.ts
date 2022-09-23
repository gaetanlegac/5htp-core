import { AsyncLocalStorage } from 'async_hooks';
import type { ChannelInfos } from '@server/services/console';

export default new AsyncLocalStorage<ChannelInfos>();