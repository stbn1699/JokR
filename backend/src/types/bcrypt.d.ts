declare module 'bcrypt' {
  export function hash(data: string, roundsOrSalt: number | string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  const bcrypt: {
    hash: typeof hash;
    compare: typeof compare;
  };
  export default bcrypt;
}

