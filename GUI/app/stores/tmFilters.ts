import { defineStore } from 'pinia'

export const useTmFiltersStore = defineStore('tmFilters', {
  state: () => ({
    // Live TM page
    liveSubsystems: [] as string[],
    liveQuickFilter: '',

    // Update TM DB page
    updateDbSubsystems: [] as string[],
    updateDbTelemetryKind: 'ANALOG' as string,
    updateDbQuickFilter: '',

    // Simulator page
    simulatorSubsystems: [] as string[],
    simulatorQuickFilter: '',
  }),
})
