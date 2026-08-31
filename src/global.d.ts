export {}

export interface ObsidianConfig {
  enabled: boolean
  vaultPath: string
  resolvedPath: string
  defaultPath: string
  exists: boolean
  lastSync: string | null
  noteCount: number
}

declare global {
  interface Window {
    api: {
      accounts: {
        getAll: () => Promise<any[]>
        create: (payload: any) => Promise<any>
        update: (id: number, payload: any) => Promise<any>
        delete: (id: number) => Promise<boolean>
      }
      strategies: {
        getAll: () => Promise<any[]>
        create: (payload: any) => Promise<any>
        update: (id: number, payload: any) => Promise<any>
        delete: (id: number) => Promise<boolean>
        getPerformance: () => Promise<any[]>
        getDetail: (id: number) => Promise<any>
      }
      confluences: {
        getAll: () => Promise<any[]>
        create: (payload: any) => Promise<any>
        update: (id: number, payload: any) => Promise<any>
        delete: (id: number) => Promise<boolean>
      }
      trades: {
        getAll: (filters?: any) => Promise<any[]>
        create: (payload: any) => Promise<any>
        update: (id: number, payload: any) => Promise<any>
        delete: (id: number) => Promise<boolean>
      }
      missedTrades: {
        getAll: (filters?: any) => Promise<any[]>
        create: (payload: any) => Promise<any>
        update: (id: number, payload: any) => Promise<any>
        delete: (id: number) => Promise<boolean>
      }
      images: {
        add: (entityType: 'trade' | 'missed_trade', entityId: number) => Promise<boolean>
        get: (entityType: 'trade' | 'missed_trade', entityId: number) => Promise<{ id: number; dataUrl: string }[]>
        remove: (imageId: number) => Promise<boolean>
      }
      reviews: {
        getAll: () => Promise<any[]>
        upsert: (payload: any) => Promise<any>
      }
      analytics: {
        getSummary: (filters: any) => Promise<any>
        getMonthlyBreakdown: (filters: any) => Promise<any[]>
        simulateFundedChallenge: (params: any) => Promise<any>
      }
      csv: {
        openForImport: () => Promise<{ filePath: string; headers: string[]; sampleRows: string[][]; totalRows: number } | null>
        import: (args: any) => Promise<number>
        export: () => Promise<string | null>
      }
      obsidian?: {
        getConfig: () => Promise<ObsidianConfig>
        setEnabled: (enabled: boolean) => Promise<ObsidianConfig>
        chooseVault: () => Promise<ObsidianConfig>
        useDefaultVault: () => Promise<ObsidianConfig>
        rebuild: () => Promise<{ ok: boolean; count: number; error?: string }>
        openInObsidian: () => Promise<void>
        showFolder: () => Promise<void>
      }
    }
  }
}
