export class IllegalArgumentException extends Error
{
  constructor(public argumentName : string, public reason : string = '')
  {
    super();
  } 
}
