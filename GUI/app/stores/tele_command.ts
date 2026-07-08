import { defineStore } from 'pinia'

export const tCstore = defineStore('tCstore', {
  state: () => ({
    summary: '' as string,
    status: [] as string[], // latest first
    progress: 0 as number,
    manualCommands: [] as any[],
  }),

  actions: {
    loadManualCommands(commands: any) {
      this.manualCommands = commands
    },
    getGroupNames() {
      if (!this.manualCommands || Object.keys(this.manualCommands).length === 0) {
        return []
      }
      return Object.keys(this.manualCommands)
    },

    getManualCommands(groups: string[]) {
      if (!this.manualCommands || Object.keys(this.manualCommands).length === 0) {
        return []
      }

      if (groups && groups.length > 0) {
        const filteredCommands = []
        for (const group of groups) {
          if (this.manualCommands[group]) {
            filteredCommands.push(...this.manualCommands[group])
          }
        }
        return filteredCommands
      }
      else {
        return Object.values(this.manualCommands).flat()
      }
    },

    setStore(payload: {
      summary?: string
      status?: string
      progress?: number
    }) {
      if (payload.summary && payload.summary.length > 0) {
        this.summary = payload.summary
      }

      if (payload.status && payload.status.length > 0) {
        this.status.unshift(payload.status)
        if (this.status.length > 20) {
          this.status.pop()
        }
      }

      if (payload.progress !== undefined) {
        this.progress = Number.parseInt(payload.progress.toString(), 10)
      }
    },

    setSummary(summary: string) {
      this.summary = summary
    },

    setStatus(status: string[]) {
      this.status = status
    },

    setProgress(progress: number) {
      this.progress = progress
    },
  },
})
