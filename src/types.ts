export type LogEntry = {
  id: string
  text: string
  createdAt: string
}

export type QuickLogSettingValueMap = {
  showTimeStrip: boolean
}

export type QuickLogSettingId = keyof QuickLogSettingValueMap

export type QuickLogSetting = {
  [K in QuickLogSettingId]: {
    id: K
    value: QuickLogSettingValueMap[K]
  }
}[QuickLogSettingId]

export type QuickLogSettings = QuickLogSettingValueMap
