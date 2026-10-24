import pkg from '../package.json';

/** App version from package.json, shown in the header so a deploy can be confirmed on the phone. */
export const APP_VERSION: string = pkg.version;
