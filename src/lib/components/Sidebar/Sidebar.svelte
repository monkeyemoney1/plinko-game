<script lang="ts">
  import { Select } from '$lib/components/ui';
  import { autoBetIntervalMs, rowCountOptions } from '$lib/constants/game';
  import {
    balance,
    betAmount,
    betAmountOfExistingBalls,
    plinkoEngine,
    riskLevel,
    rowCount,
  } from '$lib/stores/game';
  import { isLiveStatsOpen } from '$lib/stores/layout';
  import { BetMode, RiskLevel } from '$lib/types';
  import { flyAndScale } from '$lib/utils/transitions';
  import { Popover, Tooltip } from 'bits-ui';
  import ChartLine from 'phosphor-svelte/lib/ChartLine';
  import Infinity from 'phosphor-svelte/lib/Infinity';
  import Question from 'phosphor-svelte/lib/Question';
  import type { FormEventHandler } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import { tonConnectUI } from '$lib/tonconnect';
  import { goto } from '$app/navigation';

  let betMode: BetMode = $state(BetMode.MANUAL);

  /**
   * When `betMode` is `AUTO`, the number of bets to be placed. Zero means infinite bets.
   */
  let autoBetInput = $state(0);

  /**
   * Number of auto bets remaining when `betMode` is `AUTO`.
   *
   * - `number`: Finite count of how many bets left. It decrements from `autoBetInput` to 0.
   * - `null`: For infinite bets (i.e. `autoBetInput` is 0).
   */
  let autoBetsLeft: number | null = $state(null);

  let autoBetInterval: ReturnType<typeof setInterval> | null = $state(null);

  let isBetAmountNegative = $derived($betAmount < 0);
  let isBetExceedBalance = $derived($betAmount > $balance);
  let isAutoBetInputNegative = $derived(autoBetInput < 0);

  let isDropBallDisabled = $derived(
    $plinkoEngine === null || isBetAmountNegative || isBetExceedBalance || isAutoBetInputNegative,
  );

  let hasOutstandingBalls = $derived(Object.keys($betAmountOfExistingBalls).length > 0);

  // Временный переключатель скорости (для тестов)
  // 1x (нормально), 0.5x (в 2 раза медленнее), 0.33x (в ~3 раза медленнее)
  let speedLabel = $state<'1x' | '0.5x' | '0.33x'>('1x');
  function applySpeed(label: '1x' | '0.5x' | '0.33x') {
    speedLabel = label;
    const scale = label === '1x' ? 1 : label === '0.5x' ? 0.5 : 0.33;
    $plinkoEngine?.setTimeScale?.(scale);
  }

  const handleBetAmountFocusOut: FormEventHandler<HTMLInputElement> = (e) => {
    const parsedValue = parseFloat(e.currentTarget.value.trim());
    if (isNaN(parsedValue)) {
      $betAmount = -1; // If input field is empty, this forces re-render so its value resets to 0
      $betAmount = 0;
    } else {
      $betAmount = parsedValue;
    }
  };

  function resetAutoBetInterval() {
    if (autoBetInterval !== null) {
      clearInterval(autoBetInterval);
      autoBetInterval = null;
    }
  }

  function autoBetDropBall() {
    if (isBetExceedBalance) {
      resetAutoBetInterval();
      return;
    }

    // Infinite mode
    if (autoBetsLeft === null) {
      $plinkoEngine?.dropBall();
      return;
    }

    // Finite mode
    if (autoBetsLeft > 0) {
      $plinkoEngine?.dropBall();
      autoBetsLeft -= 1;
    }
    if (autoBetsLeft === 0 && autoBetInterval !== null) {
      resetAutoBetInterval();
      return;
    }
  }

  const handleAutoBetInputFocusOut: FormEventHandler<HTMLInputElement> = (e) => {
    const parsedValue = parseInt(e.currentTarget.value.trim());
    if (isNaN(parsedValue)) {
      autoBetInput = -1; // If input field is empty, this forces re-render so its value resets to 0
      autoBetInput = 0;
    } else {
      autoBetInput = parsedValue;
    }
  };

  function handleBetClick() {
    if (betMode === BetMode.MANUAL) {
      $plinkoEngine?.dropBall();
    } else if (autoBetInterval === null) {
      autoBetsLeft = autoBetInput === 0 ? null : autoBetInput;
      autoBetInterval = setInterval(autoBetDropBall, autoBetIntervalMs);
    } else if (autoBetInterval !== null) {
      resetAutoBetInterval();
    }
  }

  const betModes = [
    { value: BetMode.MANUAL, label: 'Ручной\nрежим' },
    { value: BetMode.AUTO, label: 'Автоматический\nрежим' },
  ];
  const riskLevels = [
    { value: RiskLevel.LOW, label: 'Низкий' },
    { value: RiskLevel.MEDIUM, label: 'Средний' },
    { value: RiskLevel.HIGH, label: 'Высокий' },
  ];
  const rowCounts = rowCountOptions.map((value) => ({ value, label: value.toString() }));
</script>

<div class="flex flex-col gap-5 bg-slate-700 p-3 lg:max-w-80">
  <!-- ...existing code... -->

  <div class="relative">
  <label for="betAmount" class="text-sm font-medium text-slate-300">Размер ставки</label>
    <div class="flex">
      <div class="relative flex-1">
        <input
          id="betAmount"
          value={$betAmount}
          onfocusout={handleBetAmountFocusOut}
          disabled={autoBetInterval !== null}
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          class={twMerge(
            'w-full rounded-l-md border-2 border-slate-600 bg-slate-900 py-2 pr-2 pl-7 text-sm text-white transition-colors hover:cursor-pointer hover:not-disabled:border-slate-500 focus:border-slate-500 focus:outline-hidden  disabled:cursor-not-allowed disabled:opacity-50',
            (isBetAmountNegative || isBetExceedBalance) &&
              'border-red-500 hover:not-disabled:border-red-400 focus:border-red-400',
          )}
        />
  <div class="absolute top-2 left-3 text-slate-500 select-none" aria-hidden="true">⭐️</div>
      </div>
      <button
        disabled={autoBetInterval !== null}
        onclick={() => {
          $betAmount = parseFloat(($betAmount / 2).toFixed(2));
        }}
        class="touch-manipulation bg-slate-600 px-4 font-bold text-white diagonal-fractions transition-colors hover:not-disabled:bg-slate-500 active:not-disabled:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        1/2
      </button>
      <button
        disabled={autoBetInterval !== null}
        onclick={() => {
          $betAmount = parseFloat(($betAmount * 2).toFixed(2));
        }}
        class="relative touch-manipulation rounded-r-md bg-slate-600 px-4 text-sm font-bold text-white transition-colors after:absolute after:left-0 after:inline-block after:h-1/2 after:w-[2px] after:bg-slate-800 after:content-[''] hover:not-disabled:bg-slate-500 active:not-disabled:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        2×
      </button>
    </div>
    {#if isBetAmountNegative}
      <p class="absolute text-xs leading-5 text-red-400">
        This must be greater than or equal to 0.
      </p>
    {:else if isBetExceedBalance}
  <p class="absolute text-xs leading-5 text-red-400">Минимальная ставка 1</p>
    {/if}
  </div>

  <div>
  <label for="riskLevel" class="text-sm font-medium text-slate-300">Риск</label>
    <Select
      id="riskLevel"
      bind:value={$riskLevel}
      items={riskLevels}
      disabled={hasOutstandingBalls || autoBetInterval !== null}
    />
  </div>

  <div>
  <label for="rowCount" class="text-sm font-medium text-slate-300">Количество рядов</label>
    <Select
      id="rowCount"
      bind:value={$rowCount}
      items={rowCounts}
      disabled={hasOutstandingBalls || autoBetInterval !== null}
    />
  </div>

  {#if betMode === BetMode.AUTO}
    <div>
      <div class="flex items-center gap-1">
  <label for="autoBetInput" class="text-sm font-medium text-slate-300">Количество бросков</label>
        <Popover.Root>
          <Popover.Trigger class="p-1">
            <Question class="text-slate-300" weight="bold" />
          </Popover.Trigger>
          <Popover.Content
            class="z-30 max-w-lg rounded-md bg-white p-3 text-sm font-medium text-gray-950 drop-shadow-xl"
          >
            <p>Введите "0" чтобы убрать лимит.</p>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </div>
      <div class="relative">
        <input
          id="autoBetInput"
          value={autoBetInterval === null ? autoBetInput : autoBetsLeft ?? 0}
          disabled={autoBetInterval !== null}
          onfocusout={handleAutoBetInputFocusOut}
          type="number"
          min="0"
          inputmode="numeric"
          class={twMerge(
            'w-full rounded-md border-2 border-slate-600 bg-slate-900 py-2 pr-8 pl-3 text-sm text-white transition-colors hover:cursor-pointer hover:not-disabled:border-slate-500 focus:border-slate-500 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            isAutoBetInputNegative && 'border-red-500 hover:border-red-400 focus:border-red-400',
          )}
        />
        {#if autoBetInput === 0}
          <Infinity class="absolute top-3 right-3 size-4 text-slate-400" weight="bold" />
        {/if}
      </div>
      {#if isAutoBetInputNegative}
        <p class="text-xs leading-5 text-red-400">This must be greater than or equal to 0.</p>
      {/if}
    </div>
  {/if}

  <button
    onclick={handleBetClick}
    disabled={isDropBallDisabled}
    class={twMerge(
      'touch-manipulation rounded-md bg-green-500 py-3 font-semibold text-slate-900 transition-colors hover:bg-green-400 active:bg-green-600 disabled:bg-neutral-600 disabled:text-neutral-400',
      autoBetInterval !== null && 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600',
    )}
  >
    {#if betMode === BetMode.MANUAL}
  Бросить мяч
    {:else if autoBetInterval === null}
  Авто-бросок
    {:else}
      Stop Autobet
    {/if}
  </button>

  <div class="flex gap-1 rounded-full bg-slate-900 p-0.5 mt-2 h-8">
    {#each betModes as { value, label }}
      <button
        disabled={autoBetInterval !== null}
        onclick={() => (betMode = value)}
        class={twMerge(
          'flex-1 rounded-full py-1 text-[11px] font-medium text-white leading-[1.1] transition hover:not-disabled:bg-slate-600 active:not-disabled:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50 whitespace-pre-line',
          betMode === value && 'bg-slate-600',
        )}
      >
        {label}
      </button>
    {/each}
  </div>

  <div class="mt-auto pt-5">
    <div class="flex items-center gap-4 border-t border-slate-600 pt-3">
      <Tooltip.Provider delayDuration={0} disableCloseOnTriggerClick>
        <!-- Временный переключатель скорости игры -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-300">Скорость:</span>
          <div class="flex rounded-md overflow-hidden border border-slate-600">
            <button
              class={twMerge('px-2 py-1 text-xs text-white bg-slate-700 hover:bg-slate-600', speedLabel === '1x' && 'bg-slate-600')}
              onclick={() => applySpeed('1x')}
            >1x</button>
            <button
              class={twMerge('px-2 py-1 text-xs text-white bg-slate-700 hover:bg-slate-600 border-l border-slate-600', speedLabel === '0.5x' && 'bg-slate-600')}
              onclick={() => applySpeed('0.5x')}
            >0.5x</button>
            <button
              class={twMerge('px-2 py-1 text-xs text-white bg-slate-700 hover:bg-slate-600 border-l border-slate-600', speedLabel === '0.33x' && 'bg-slate-600')}
              onclick={() => applySpeed('0.33x')}
            >0.33x</button>
          </div>
        </div>
        <!-- Live Stats Button + Logout Button -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <button
            onclick={() => ($isLiveStatsOpen = !$isLiveStatsOpen)}
            class={twMerge(
              'rounded-full p-2 text-slate-300 transition hover:bg-slate-600 active:bg-slate-500',
              $isLiveStatsOpen && 'text-slate-100',
            )}
          >
            <ChartLine class="size-6" weight="bold" />
          </button>
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors"
            onclick={() => goto('/profile')}
          >
            Профиль
          </button>
          <button
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors"
            onclick={async () => {
              try {
                await tonConnectUI?.disconnect();
              } catch (e) {
                // ignore
              }
              localStorage.removeItem('plinko_is_auth');
              localStorage.removeItem('ton_address');
              goto('/auth');
            }}
          >
            Выйти
          </button>
        </div>
      </Tooltip.Provider>
    </div>
  </div>
</div>
