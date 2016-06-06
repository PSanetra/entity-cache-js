export declare class IllegalArgumentException extends Error {
    argumentName: string;
    reason: string;
    constructor(argumentName: string, reason?: string);
}
