export namespace InvalidKeyError {
  export type defaultMessages = {
    invalid: string;
    valid: string;
  };
  export type keys<TInvalid extends unknown[], TValid extends unknown[]> = {
    invalid: TInvalid;
    valid: TValid;
  };
  export type options<TInvalid extends unknown[], TValid extends unknown[]> = {
    messages: defaultMessages;
    keys: keys<TInvalid, TValid>;
    formatter: Intl.ListFormat;
  };
}
export class InvalidKeyError<
  invalidKeys extends unknown[],
  validKeys extends unknown[]
> extends Error {
  constructor(
    invalidKeys: invalidKeys,
    validKeys: validKeys,
    message?:
      | string
      | ((options: InvalidKeyError.options<invalidKeys, validKeys>) => string)
  ) {
    const formatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'conjunction',
    });
    const defaultInvalidMessage = `Invalid keys were found (${formatter.format(
      invalidKeys.map(String)
    )}). Please remove them to continue.`;
    const defaultValidMessage = `The available keys are ${formatter.format(
      validKeys.map(String)
    )}`;
    let resolvedMessage = `${defaultInvalidMessage} ${defaultValidMessage}`;

    if (typeof message === 'string') {
      resolvedMessage = message;
    }

    if (typeof message === 'function') {
      resolvedMessage = message({
        formatter,
        keys: {
          invalid: invalidKeys,
          valid: validKeys,
        },
        messages: {
          invalid: defaultInvalidMessage,
          valid: defaultValidMessage,
        },
      });
    }

    super(resolvedMessage);

    this.name = 'InvalidKeyError';

    Object.setPrototypeOf(this, InvalidKeyError.prototype);
  }
}
