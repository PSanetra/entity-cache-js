
export type Listener = (event : any)=>void;

export class EventEmitter {

  private _listeners : Array<Listener> = new Array<Listener>();

  subscribe(listener : Listener)
  {
    if(this._listeners.some((element)=>element === listener))
      return;

    this._listeners.push(listener);
  }

  unsubscribe(listener : Listener)
  {
    for(let i = this._listeners.length; i >= 0; i--)
    {
      if(this._listeners[i] === listener)
      {
        this._listeners.splice(i, 1);
        return;
      }
    }
  }

  emit(event? : any)
  {
    for(let listener of this._listeners)
    {
      try
      {
        listener(event);
      }
      catch (exception)
      {
        console.error(exception);
      }
    }
  }

}
