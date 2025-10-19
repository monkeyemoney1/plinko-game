import { TonConnectUI } from '@tonconnect/ui';

import { browser } from '$app/environment';
let tonConnectUI: TonConnectUI | null = null;

if (browser) {
    tonConnectUI = new TonConnectUI({
        manifestUrl: 'https://greeboolya.github.io/Plinkogame/.well-known/tonconnect-manifest.json',
        // Отключаем автовосстановление и Android back handler для стабильности
        restoreConnection: false,
        enableAndroidBackHandler: false
    });
}

export { tonConnectUI };
