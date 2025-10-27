type LogLevel = 'info' | 'warn' | 'error';
  type MultiStepFormLoggerOptions = {
    prefix?: string;
    includeTimestamp?: boolean;
    throwOnError?: boolean;
  };
  type WrapWithOptions = '[]' | '{}' | 'none';
  type ReplacePrefixOptions = {
    action: 'replace';
    value: string;
    wrapWith?: WrapWithOptions;
  };
  type AppendOrPrependPrefixOptions = {
    action: 'append' | 'prepend';
    value: string;
    delimiter?: string;
    wrapWith?: {
      originalPrefix?: WrapWithOptions;
      addedPrefix?: WrapWithOptions;
    };
  };
  type PrefixOptions = ReplacePrefixOptions | AppendOrPrependPrefixOptions;
  type BaseLogOptions = {
    prefix?: PrefixOptions;
    logLevelOptions?: {
      level?: LogLevel;
      wrapWith?: WrapWithOptions;
    };
    includeTimestamp?: boolean;
  };
  type ErrorLogOptions = BaseLogOptions & {
    throw?: boolean;
  };

  export class MultiStepFormLogger {
    private readonly prefix: string;
    private readonly includeTimestamp: boolean;
    private readonly throwOnError: boolean;

    constructor(options?: MultiStepFormLoggerOptions) {
      const { includeTimestamp, prefix, throwOnError } = options ?? {};

      this.prefix = prefix ?? 'MultiStepFormSchema';
      this.includeTimestamp = includeTimestamp ?? false;
      this.throwOnError = throwOnError ?? false;
    }

    private wrapValue(wrapWith: WrapWithOptions, value: string) {
      if (wrapWith === '[]') {
        return `[${value}]`;
      }

      if (wrapWith === '{}') {
        return `{${value}}`;
      }

      if (wrapWith === 'none') {
        return value;
      }

      throw new Error(
        `The first argument ${wrapWith} is not valid. Valid options include: "[]", "{}", and "none"`
      );
    }

    private formatPrefix(options: PrefixOptions | undefined) {
      if (!options) {
        return this.prefix;
      }

      const { action, value, wrapWith } = options;

      if (action === 'replace') {
        return this.wrapValue(wrapWith ?? '[]', value);
      }

      const { delimiter } = options;

      if (action === 'append') {
        return `${this.wrapValue(
          wrapWith?.originalPrefix ?? '[]',
          this.prefix
        )}${delimiter}${this.wrapValue(
          wrapWith?.addedPrefix ?? '[]',
          value
        )}`.trim();
      }

      if (action === 'prepend') {
        return `${this.wrapValue(
          wrapWith?.addedPrefix ?? '[]',
          value
        )}${delimiter}${this.wrapValue(
          wrapWith?.originalPrefix ?? '[]',
          this.prefix
        )}`.trim();
      }

      return this.prefix;
    }

    private formatMessage(
      level: LogLevel,
      message: string,
      options?: BaseLogOptions
    ) {
      const {
        includeTimestamp = this.includeTimestamp,
        prefix,
        logLevelOptions,
      } = options ?? {};
      const formattedPrefix = this.formatPrefix(prefix);
      const formattedLogLevel = this.wrapValue(
        logLevelOptions?.wrapWith ?? '[]',
        (logLevelOptions?.level ?? level).toUpperCase()
      );
      const formattedMessage = `${formattedPrefix} ${formattedLogLevel} ${message}`;

      if (includeTimestamp) {
        const timestamp = new Date().toISOString();

        return `[${timestamp}] ${formattedMessage}`;
      }

      return formattedMessage;
    }

    info(message: string, options?: BaseLogOptions) {
      console.info(this.formatMessage('info', message, options));
    }

    warn(message: string, options?: BaseLogOptions) {
      console.warn(this.formatMessage('warn', message, options));
    }

    error(message: string, options?: BaseLogOptions): void;
    error(message: string, options?: ErrorLogOptions): never;
    error(message: string, options?: ErrorLogOptions) {
      const formatted = this.formatMessage('error', message, options);

      console.error(formatted);

      const throwOnError = options?.throw ?? this.throwOnError;

      if (throwOnError) {
        throw new Error(formatted);
      }
    }
  }