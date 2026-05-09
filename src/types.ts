export type LogEntry = {
  id: string
  text: string
  createdAt: string
}

export type QuickLogSettingValueMap = {
  showTimeStrip: boolean
}

export type QuickLogSettingId = keyof QuickLogSettingValueMap

export type QuickLogSettings = QuickLogSettingValueMap
