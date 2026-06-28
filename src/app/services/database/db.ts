import Dexie, { Table } from 'dexie';

export enum Lang {
    FR,
    EN,
}

export interface DictionaryRecord {
    key: string;
    list: string[];
}

export const dictionaryCache = new Set<string>();

export class DictionaryDB extends Dexie {
    words!: Table<DictionaryRecord, string>;
  
    constructor() {
      super('ngdexieliveQuery_v4');
      this.version(5).stores({
        words: 'key',
      });
      this.on('populate', () => this.populate());
    }

    populate() {
      console.log('populate')
    }
  }
  
  export const db = new DictionaryDB();