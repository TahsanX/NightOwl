declare module 'opening_hours' {
  export default class OpeningHours {
    constructor(value: string, nominatimObject?: unknown, optionalConf?: unknown);
    getState(date?: Date): boolean;
    getUnknown(date?: Date): boolean;
    getComment(date?: Date): string | undefined;
  }
}
