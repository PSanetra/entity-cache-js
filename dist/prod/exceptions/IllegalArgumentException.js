"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var IllegalArgumentException = (function (_super) {
    __extends(IllegalArgumentException, _super);
    function IllegalArgumentException(argumentName, reason) {
        if (reason === void 0) { reason = ''; }
        _super.call(this);
        this.argumentName = argumentName;
        this.reason = reason;
    }
    return IllegalArgumentException;
}(Error));
exports.IllegalArgumentException = IllegalArgumentException;
