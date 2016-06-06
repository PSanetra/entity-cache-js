export declare type Listener = (event: any) => void;
export declare class EventEmitter {
    private _listeners;
    subscribe(listener: Listener): void;
    unsubscribe(listener: Listener): void;
    emit(event?: any): void;
}
