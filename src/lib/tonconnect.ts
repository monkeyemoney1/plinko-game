import { TonConnectUI } from '@tonconnect/ui';
import { env as publicEnv } from '$env/dynamic/public';

import { browser } from '$app/environment';
let tonConnectUI: TonConnectUI | null = null;

if (browser) {
    const botUsername = publicEnv.PUBLIC_TELEGRAM_BOT_USERNAME || 'PlinkoStarsBot';
    const twaReturnUrl = `https://t.me/${botUsername}/app`;
    tonConnectUI = new TonConnectUI({
        manifestUrl: 'https://plinko-game-9hku.onrender.com/.well-known/tonconnect-manifest.json',
        // Отключаем автовосстановление и Android back handler для стабильности
        restoreConnection: false,
        enableAndroidBackHandler: false,
        actionsConfiguration: {
            twaReturnUrl: twaReturnUrl as unknown as `${string}://${string}`
        }
    });
}

export { tonConnectUI };
