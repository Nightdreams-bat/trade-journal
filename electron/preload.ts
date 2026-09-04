import { contextBridge, ipcRenderer } from 'electron'

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  accounts: {
    getAll: () => invoke('accounts:getAll'),
    create: (payload: unknown) => invoke('accounts:create', payload),
    update: (id: number, payload: unknown) => invoke('accounts:update', id, payload),
    delete: (id: number) => invoke('accounts:delete', id),
  },
  strategies: {
    getAll: () => invoke('strategies:getAll'),
    create: (payload: unknown) => invoke('strategies:create', payload),
    update: (id: number, payload: unknown) => invoke('strategies:update', id, payload),
    delete: (id: number) => invoke('strategies:delete', id),
    getPerformance: () => invoke('strategies:getPerformance'),
    getDetail: (id: number) => invoke('strategies:getDetail', id),
  },
  confluences: {
    getAll: () => invoke('confluences:getAll'),
    create: (payload: unknown) => invoke('confluences:create', payload),
    update: (id: number, payload: unknown) => invoke('confluences:update', id, payload),
    delete: (id: number) => invoke('confluences:delete', id),
  },
  trades: {
    getAll: (filters?: unknown) => invoke('trades:getAll', filters),
    create: (payload: unknown) => invoke('trades:create', payload),
    update: (id: number, payload: unknown) => invoke('trades:update', id, payload),
    delete: (id: number) => invoke('trades:delete', id),
  },
  missedTrades: {
    getAll: (filters?: unknown) => invoke('missedTrades:getAll', filters),
    create: (payload: unknown) => invoke('missedTrades:create', payload),
    update: (id: number, payload: unknown) => invoke('missedTrades:update', id, payload),
    delete: (id: number) => invoke('missedTrades:delete', id),
  },
  images: {
    add: (entityType: 'trade' | 'missed_trade', entityId: number) => invoke('images:add', entityType, entityId),
    get: (entityType: 'trade' | 'missed_trade', entityId: number) => invoke('images:get', entityType, entityId),
    remove: (imageId: number) => invoke('images:remove', imageId),
    getAllForTrades: () => invoke('images:getAllForTrades'),
    getAllForMissedTrades: () => invoke('images:getAllForMissedTrades'),
  },
  reviews: {
    getAll: () => invoke('reviews:getAll'),
    upsert: (payload: unknown) => invoke('reviews:upsert', payload),
  },
  analytics: {
    getSummary: (filters: unknown) => invoke('analytics:getSummary', filters),
    getMonthlyBreakdown: (filters: unknown) => invoke('analytics:getMonthlyBreakdown', filters),
    simulateFundedChallenge: (params: unknown) => invoke('analytics:simulateFundedChallenge', params),
  },
  csv: {
    openForImport: () => invoke('csv:openForImport'),
    import: (args: unknown) => invoke('csv:import', args),
    export: () => invoke('csv:export'),
  },
  calendar: {
    getConfig: () => invoke('calendar:getConfig'),
    setEnabled: (enabled: boolean) => invoke('calendar:setEnabled', enabled),
    setSyncOnLaunch: (value: boolean) => invoke('calendar:setSyncOnLaunch', value),
    sync: () => invoke('calendar:sync'),
    getEvents: (range?: { from?: string; to?: string }) => invoke('calendar:getEvents', range),
  },
  obsidian: {
    getConfig: () => invoke('obsidian:getConfig'),
    setEnabled: (enabled: boolean) => invoke('obsidian:setEnabled', enabled),
    chooseVault: () => invoke('obsidian:chooseVault'),
    useDefaultVault: () => invoke('obsidian:useDefaultVault'),
    rebuild: () => invoke('obsidian:rebuild'),
    openInObsidian: () => invoke('obsidian:openInObsidian'),
    showFolder: () => invoke('obsidian:showFolder'),
  },
})
