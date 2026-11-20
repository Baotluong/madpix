import { Linking } from 'react-native';

/** The rules and privacy policy, published from /docs with GitHub Pages. */
const SITE = 'https://baotluong.github.io/madpix';
export const RULES_URL = `${SITE}/rules/`;
export const PRIVACY_URL = `${SITE}/privacy/`;

export const openLink = (url: string) => Linking.openURL(url).catch(() => {});
