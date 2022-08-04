import { EventEmitter } from 'events';
import { Mouvement } from '@accounting/mouvement';


class Events {
    'new-mouvement': Mouvement;
}

export type EventNames = keyof Events;



export class EventManager {
    private emitter$ = new EventEmitter();

    emit<N extends EventNames>(name: N, data: Events[ N ]) {
        this.emitter$.emit(name, data);
    }

    listen<N extends EventNames>(name: N, listener: (data: Events[ N ]) => void) {
        this.emitter$.on(name, listener);
    }
}
