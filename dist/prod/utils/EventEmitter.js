"use strict";
var EventEmitter = (function () {
    function EventEmitter() {
        this._listeners = new Array();
    }
    EventEmitter.prototype.subscribe = function (listener) {
        if (this._listeners.some(function (element) { return element === listener; }))
            return;
        this._listeners.push(listener);
    };
    EventEmitter.prototype.unsubscribe = function (listener) {
        for (var i = this._listeners.length; i >= 0; i--) {
            if (this._listeners[i] === listener) {
                this._listeners.splice(i, 1);
                return;
            }
        }
    };
    EventEmitter.prototype.emit = function (event) {
        for (var _i = 0, _a = this._listeners; _i < _a.length; _i++) {
            var listener = _a[_i];
            try {
                listener(event);
            }
            catch (exception) {
                console.error(exception);
            }
        }
    };
    return EventEmitter;
}());
exports.EventEmitter = EventEmitter;
