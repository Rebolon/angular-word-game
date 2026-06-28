/// <reference lib="webworker" />

import { Observable, combineLatestWith, from, map, mergeMap, of, shareReplay, switchMap, take, tap, scan } from 'rxjs';
import { ajax } from "rxjs/internal/ajax/ajax";
import { AjaxResponse } from "rxjs/internal/ajax/AjaxResponse";
import { liveQuery } from 'dexie';
import { Lang, Word, db } from '../services/database/db';
import { MESSAGES_REQUEST } from '../services/database/messages-request';
import { MESSAGES_RESPONSE } from '../services/database/messages-response';

const allowedMessages = [
  MESSAGES_REQUEST.GET_COUNTERS,
  MESSAGES_REQUEST.INIT_DB,
];

const response$: Observable<AjaxResponse<string>> = ajax({
  url: '/dictionnaries/fr/ods6.txt',
  headers: {
    "Accept": "text"
  },
  responseType: "text"
});

const wordsInDictionnary$: Observable<Word[]> = response$.pipe(
  map(dic => {
    const rawWords = dic.response.split(/\r?\n/);
    const uniqueWordsSet = new Set<string>();
    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i].trim().toUpperCase();
      if (word.length >= 3) {
        uniqueWordsSet.add(word);
      }
    }
    return Array.from(uniqueWordsSet).map(val => ({
      lang: Lang.FR,
      value: val
    }));
  }),
  shareReplay(1)
);

const dictionnayCount$: Observable<number> = wordsInDictionnary$.pipe(
  map(words => words.length)
);

const databaseCount$ = liveQuery(() => db.words.count());

const populate$ = (startIndex = 0): Observable<number> => {
  return wordsInDictionnary$.pipe(
    switchMap(words => {
      const missingWords = words.slice(startIndex);
      const chunkSize = 30000;
      const chunks: Word[][] = [];
      for (let i = 0; i < missingWords.length; i += chunkSize) {
        chunks.push(missingWords.slice(i, i + chunkSize));
      }
      
      if (chunks.length === 0) {
        return of(words.length);
      }

      return from(chunks).pipe(
        mergeMap(chunk => from(db.words.bulkAdd(chunk)).pipe(
          map(() => chunk.length)
        ), 4),
        scan((acc, chunkLength) => acc + chunkLength, startIndex)
      );
    })
  );
};

addEventListener('message', ({ data }) => {
  if (allowedMessages.find((value) => value === data) === undefined) {
    return postMessage(`${MESSAGES_RESPONSE.ERROR} LOGIC_ERROR: ${data}`);
  }

  dictionnayCount$.pipe(
    combineLatestWith(databaseCount$),
    take(1)
  )
  .subscribe({
    next: ([dictionnaryCount, databaseCount]) => {
      postMessage(`${MESSAGES_RESPONSE.DB_COUNTERS} ${databaseCount} ${dictionnaryCount}`);
    },
    error: (err) => postMessage(`${MESSAGES_RESPONSE.ERROR} ${err}`)
  });

  if (data === MESSAGES_REQUEST.INIT_DB) {
    dictionnayCount$.pipe(
      combineLatestWith(databaseCount$),
      take(1),
      switchMap(([dictionnaryCount, databaseCount]) => {
        if (databaseCount < dictionnaryCount) {
          postMessage(`${MESSAGES_RESPONSE.DB_START_POPULATE}`);
          return populate$(databaseCount).pipe(
            tap((progress) => {
              postMessage(`${MESSAGES_RESPONSE.DB_IN_PROGRESS} ${progress} mots`);
              postMessage(`${MESSAGES_RESPONSE.DB_COUNTERS} ${progress} ${dictionnaryCount}`);
            })
          );
        }
        return of(dictionnaryCount);
      })
    )
    .subscribe({
      complete: () => postMessage(`${MESSAGES_RESPONSE.DB_POPULATED}`),
      error: (err) => postMessage(`${MESSAGES_RESPONSE.ERROR} ${err}`)
    });
  }
});
