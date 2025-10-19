import { TonConnectUI } from '@tonconnect/ui';

import { browser } from '$app/environment';
let tonConnectUI: TonConnectUI | null = null;

if (browser) {
    tonConnectUI = new TonConnectUI({
        manifestUrl: 'https://plinko-game-9hku.onrender.com/.well-known/tonconnect-manifest.json',
        // Отключаем автовосстановление и Android back handler для стабильности
        restoreConnection: false,
        enableAndroidBackHandler: false
    });
}

export { tonConnectUI };
